/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals";
import prisma from "../../../../config/prismaClient";
import barbeariaService from "./barbeariaService";
import { NotAuthorizedError } from "../../../../errors/NotAuthorizedError";

// Mantém mocks existentes
jest.mock("multer-s3", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    single: jest.fn().mockReturnValue((req: any, res: any, next: any) => {
      req.file = { location: "http://exemplo.com/foto.jpg", key: "chave-s3" };
      next();
    }),
  })),
}));

jest.mock("../../../../config/prismaClient", () => ({
  __esModule: true,
  default: {
    barbearia: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      // findMany não está mockado originalmente; será atribuído nos testes onde necessário
    },
  },
}));

jest.mock("../../../../utils/functions/aws", () => ({
  deleteObject: jest.fn(),
}));

describe("barbeariaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve criar uma nova barbearia", async () => {
    const body = {
      nome: "Barbearia do Teste",
      endereco: "Rua dos Testes, 123",
    };
    const usuarioId = 1;
    const file = {
      location: "http://exemplo.com/foto.jpg",
      key: "chave-s3",
    } as Express.MulterS3.File;

    jest.mocked(prisma.barbearia.create).mockResolvedValue({
      id: 1,
      ...body,
      foto: file.location,
      chaveAws: file.key,
      usuarioId: usuarioId,
    });

    const resultado = await barbeariaService.criarBarbearia(
      {
        nome: body.nome,
        endereco: body.endereco,
        foto: file ? (file as Express.MulterS3.File).location : null,
        chaveAws: file ? (file as Express.MulterS3.File).key : null,
      },
      usuarioId,
      file,
    );

    expect(prisma.barbearia.create).toHaveBeenCalledWith({
      data: {
        nome: body.nome,
        endereco: body.endereco,
        foto: file.location,
        chaveAws: file.key,
        usuarioId: usuarioId,
      },
    });

    expect(resultado).toEqual({
      id: 1,
      ...body,
      foto: file.location,
      chaveAws: file.key,
      usuarioId: usuarioId,
    });
  });

  it("deve editar uma barbearia existente com sucesso (com file)", async () => {
    const body = {
      id: 1,
      nome: "Barbearia Editada",
      endereco: "Rua dos Editados, 456",
      foto: "http://exemplo.com/nova_foto.jpg",
      chaveAws: "nova-chave-s3",
    };
    const usuarioId = 1;
    const file = {
      location: "http://exemplo.com/nova_foto.jpg",
      key: "nova-chave-s3",
    } as Express.MulterS3.File;

    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({
      id: 1,
      nome: "Barbearia Original",
      endereco: "Rua Original, 123",
      foto: "http://exemplo.com/foto_original.jpg",
      chaveAws: "chave-original-s3",
      usuarioId: usuarioId,
    });

    jest.mocked(prisma.barbearia.update).mockResolvedValue({
      ...body,
      usuarioId: usuarioId,
    });

    const resultado = await barbeariaService.editarBarbearia(
      body,
      usuarioId,
      file,
    );

    expect(prisma.barbearia.update).toHaveBeenCalledWith({
      where: { id: body.id },
      data: {
        nome: body.nome,
        endereco: body.endereco,
        foto: file.location,
        chaveAws: file.key,
      },
    });

    expect(resultado).toEqual({
      ...body,
      usuarioId: usuarioId,
    });
  });

  it("deve lançar NotAuthorizedError quando a barbearia não existir para o usuário", async () => {
    const body = {
      id: 1,
      nome: "Barbearia Fantasma",
      endereco: "Rua Fantasma, 999",
      foto: null,
      chaveAws: null,
    };
    const usuarioId = 999; // qualquer número, pois o findFirst retornará null

    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(null);

    await expect(
      barbeariaService.editarBarbearia(body, usuarioId, null),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("editarBarbearia lança Error quando id não informado", async () => {
    const existing = {
      id: 5,
      nome: "Barbearia X",
      endereco: "Rua X, 000",
      foto: "foto.jpg",
      chaveAws: "chave.jpg",
      usuarioId: 4,
    };
    const body = {
      // id ausente
      nome: "Barbearia Nova",
      endereco: "Rua Nova, 111",
      foto: null,
      chaveAws: null,
    };
    const usuarioId = 4;

    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(existing as any);

    await expect(
      barbeariaService.editarBarbearia(body as any, usuarioId, null),
    ).rejects.toThrow("Id da barbearia não informado.");
  });

  it("listarBarbearias retorna lista de barbearias", async () => {
    const mockList = [
      {
        id: 1,
        nome: "A",
        endereco: "E1",
        foto: "f1",
        chaveAws: "k1",
        usuarioId: 1,
      },
      {
        id: 2,
        nome: "B",
        endereco: "E2",
        foto: "f2",
        chaveAws: "k2",
        usuarioId: 2,
      },
    ];
    // Como findMany não foi mockado originalmente, atribuímos aqui
    (prisma.barbearia.findMany as jest.Mock) = jest
      .fn()
      .mockResolvedValue(mockList as never);

    const resultado = await barbeariaService.listarBarbearias();

    expect(prisma.barbearia.findMany).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual(mockList);
  });

  it("listarBarbearia retorna uma barbearia com serviços", async () => {
    const mockBarbearia = {
      id: 3,
      nome: "Barbearia C",
      endereco: "E3",
      foto: "f3",
      chaveAws: "k3",
      usuarioId: 3,
      servicos: [
        {
          id: 10,
          nome: "Serviço 1",
          descricao: "D1",
          preco: 25,
          foto: "s1",
          chaveAws: "sk1",
          barbeariaId: 3,
        },
      ],
    };
    (prisma.barbearia.findFirst as jest.Mock).mockResolvedValue(
      mockBarbearia as never,
    );

    const resultado = await barbeariaService.listarBarbearia(3);

    expect(prisma.barbearia.findFirst).toHaveBeenCalledWith({
      where: { id: 3 },
      include: { servicos: true },
    });
    expect(resultado).toEqual(mockBarbearia);
  });

  it("listarBarbeariasPorNome retorna barbearias filtradas por nome", async () => {
    const mockFiltered = [
      {
        id: 4,
        nome: "TesteNome",
        endereco: "E4",
        foto: "f4",
        chaveAws: "k4",
        usuarioId: 4,
      },
    ];
    (prisma.barbearia.findMany as jest.Mock) = jest
      .fn()
      .mockResolvedValue(mockFiltered as never);

    const resultado = await barbeariaService.listarBarbeariasPorNome("Teste");

    expect(prisma.barbearia.findMany).toHaveBeenCalledWith({
      where: {
        nome: {
          contains: "Teste",
        },
      },
    });
    expect(resultado).toEqual(mockFiltered);
  });

  it("deve lançar NotAuthorizedError quando o usuário não for proprietário da barbearia", async () => {
    const body = {
      id: 1,
      nome: "Barbearia Teste",
      endereco: "Rua Teste, 123",
      foto: null,
      chaveAws: null,
    };
    const usuarioId = 2; // usuário diferente

    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({
      id: 1,
      nome: "Barbearia Original",
      endereco: "Rua Original, 123",
      foto: "http://exemplo.com/original.jpg",
      chaveAws: "chave-original-s3",
      usuarioId: 1, // proprietário é outro
    } as any);

    await expect(
      barbeariaService.editarBarbearia(body, usuarioId, null),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
