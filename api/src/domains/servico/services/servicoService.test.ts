/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals";
import prisma from "../../../../config/prismaClient";
import servicoService from "./servicoService";
import { NextFunction, Request } from "express";
import { QueryError } from "../../../../errors/QueryError";
import { NotAuthorizedError } from "../../../../errors/NotAuthorizedError";

declare module "express-serve-static-core" {
  interface Request {
    file?: {
      location: string;
      key: string;
      [key: string]: unknown;
    };
  }
}

jest.mock("multer-s3", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    single: jest
      .fn()
      .mockReturnValue((req: Request, res: Response, next: NextFunction) => {
        req.file = { location: "http://exemplo.com/foto.jpg", key: "chave-s3" };
        next();
      }),
  })),
}));

jest.mock("../../../../config/prismaClient", () => ({
  __esModule: true,
  default: {
    servico: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    barbearia: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("../../../../utils/functions/aws", () => ({
  deleteObject: jest.fn(),
}));

describe("servicoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve criar um novo serviço", async () => {
    const body = {
      nome: "Barba",
      descricao: "Corte de barba",
      preco: 50,
    };

    const barbearia = {
      nome: "Barbearia do João",
      endereco: "Rua do João, 123",
      telefone: "123456789",
      foto: "http://exemplo.com/foto.jpg",
      chaveAws: "chave-s3",
      usuarioId: 1,
    };

    const idBarbearia = 1;
    const donoId = 1;
    const file = {
      location: "http://exemplo.com/foto.jpg",
      key: "chave-s3",
    } as Express.MulterS3.File;

    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({
      id: idBarbearia,
      ...barbearia,
    });

    jest.mocked(prisma.servico.findFirst).mockResolvedValue(null);

    jest.mocked(prisma.servico.create).mockResolvedValue({
      id: 1,
      ...body,
      foto: file.location,
      chaveAws: file.key,
      barbeariaId: 1,
    });

    const resultado = await servicoService.criarServico(
      {
        nome: body.nome,
        descricao: body.descricao,
        preco: +body.preco,
        id: idBarbearia,
        foto: null,
        chaveAws: null,
      },
      donoId,
      file,
    );

    expect(resultado).toEqual({
      id: 1,
      ...body,
      foto: file.location,
      chaveAws: file.key,
      barbeariaId: 1,
    });
  });

  it("deve atualizar um serviço", async () => {
    const body = {
      nome: "Barba",
      descricao: "Corte de barba",
      preco: 50,
    };

    const servicoId = 1;
    const donoId = 1;
    const file = {
      location: "http://exemplo.com/foto.jpg",
      key: "chave-s3",
    } as Express.MulterS3.File;

    jest.mocked(prisma.servico.findFirst).mockResolvedValue({
      id: servicoId,
      ...body,
      foto: file.location,
      chaveAws: file.key,
      barbeariaId: 1,
    });

    jest.mocked(prisma.servico.update).mockResolvedValue({
      id: 1,
      ...body,
      foto: file.location,
      chaveAws: file.key,
      barbeariaId: 1,
    });

    const resultado = await servicoService.editarServico(
      {
        nome: body.nome,
        descricao: body.descricao,
        preco: +body.preco,
        id: servicoId,
        foto: null,
        chaveAws: null,
      },
      donoId,
      file,
    );

    expect(resultado).toEqual({
      id: 1,
      ...body,
      foto: file.location,
      chaveAws: file.key,
      barbeariaId: 1,
    });
  });

  it("deve deletar um serviço", async () => {
    const servicoId = 1;
    const donoId = 1;

    jest.mocked(prisma.servico.findFirst).mockResolvedValue({
      id: servicoId,
      nome: "Barba",
      descricao: "Corte de barba",
      preco: 50,
      foto: "http://exemplo.com/foto.jpg",
      chaveAws: "chave-s3",
      barbeariaId: 1,
    });

    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({
      id: 1,
      nome: "Barbearia do João",
      endereco: "Rua do João, 123",
      foto: "http://exemplo.com/foto.jpg",
      chaveAws: "chave-s3",
      usuarioId: 1,
    });

    await servicoService.deletarServico(servicoId, donoId);

    expect(prisma.servico.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.servico.findFirst).toHaveBeenCalledWith({
      where: { id: servicoId },
    });

    expect(prisma.barbearia.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.barbearia.findFirst).toHaveBeenCalledWith({
      where: { usuarioId: donoId },
    });

    expect(prisma.servico.delete).toHaveBeenCalledTimes(1);
    expect(prisma.servico.delete).toHaveBeenCalledWith({
      where: { id: servicoId },
    });
  });

  it("deve listar os serviços de uma barbearia", async () => {
    const idBarbearia = 1;

    jest.mocked(prisma.servico.findMany).mockResolvedValue([
      {
        id: 1,
        nome: "Barba",
        descricao: "Corte de barba",
        preco: 50,
        foto: "http://exemplo.com/foto.jpg",
        chaveAws: "chave-s3",
        barbeariaId: 1,
      },
      {
        id: 2,
        nome: "Cabelo",
        descricao: "Corte de cabelo",
        preco: 30,
        foto: "http://exemplo.com/foto.jpg",
        chaveAws: "chave-s3",
        barbeariaId: 1,
      },
    ]);

    const resultado = await servicoService.listarServicosBarbearia(idBarbearia);

    expect(resultado).toEqual([
      {
        id: 1,
        nome: "Barba",
        descricao: "Corte de barba",
        preco: 50,
        foto: "http://exemplo.com/foto.jpg",
        chaveAws: "chave-s3",
        barbeariaId: 1,
      },
      {
        id: 2,
        nome: "Cabelo",
        descricao: "Corte de cabelo",
        preco: 30,
        foto: "http://exemplo.com/foto.jpg",
        chaveAws: "chave-s3",
        barbeariaId: 1,
      },
    ]);

    expect(prisma.servico.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.servico.findMany).toHaveBeenCalledWith({
      where: { barbeariaId: idBarbearia },
    });
  });

  // Novos testes para aumentar cobertura

  it("criarServico lança QueryError quando barbearia não encontrada", async () => {
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(null);
    await expect(
      servicoService.criarServico(
        {
          nome: "X",
          descricao: "Y",
          preco: 10,
          id: 123,
          foto: null,
          chaveAws: null,
        },
        123,
        null,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });

  it("criarServico lança QueryError quando serviço já existe", async () => {
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({ id: 5 } as any);
    jest.mocked(prisma.servico.findFirst).mockResolvedValue({ id: 10 } as any);
    await expect(
      servicoService.criarServico(
        {
          nome: "Barba",
          descricao: "Corte",
          preco: 20,
          id: 123,
          foto: null,
          chaveAws: null,
        },
        1,
        { location: "u", key: "k" } as any,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });

  it("editarServico lança QueryError quando barbearia não encontrada", async () => {
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(null);
    await expect(
      servicoService.editarServico(
        {
          id: 1,
          nome: "A",
          descricao: "B",
          preco: 30,
          foto: null,
          chaveAws: null,
        },
        99,
        null,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });

  it("editarServico lança QueryError quando serviço não encontrado", async () => {
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({ id: 2 } as any);
    jest.mocked(prisma.servico.findFirst).mockResolvedValue(null);
    await expect(
      servicoService.editarServico(
        {
          id: 2,
          nome: "A",
          descricao: "B",
          preco: 30,
          foto: null,
          chaveAws: null,
        },
        1,
        null,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });

  it("editarServico lança NotAuthorizedError quando usuário não autorizado", async () => {
    const serv = {
      id: 3,
      nome: "X",
      descricao: "Y",
      preco: 10,
      foto: "f",
      chaveAws: "k",
      barbeariaId: 8,
    };
    jest
      .mocked(prisma.barbearia.findFirst)
      .mockResolvedValue({ id: 5, usuarioId: 5 } as any);
    jest.mocked(prisma.servico.findFirst).mockResolvedValue(serv as any);
    await expect(
      servicoService.editarServico(
        {
          id: 3,
          nome: "X",
          descricao: "Y",
          preco: 10,
          foto: null,
          chaveAws: null,
        },
        5,
        null,
      ),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("editarServico lança QueryError quando nome duplicado", async () => {
    const serv = {
      id: 4,
      nome: "Old",
      descricao: "Z",
      preco: 15,
      foto: "f",
      chaveAws: "k",
      barbeariaId: 7,
    };
    const conflict = {
      id: 5,
      nome: "New",
      descricao: "W",
      preco: 20,
      foto: "f2",
      chaveAws: "k2",
      barbeariaId: 7,
    };
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({ id: 7 } as any);
    jest
      .mocked(prisma.servico.findFirst)
      .mockResolvedValueOnce(serv as any) // primeiro findFirst retorna serv
      .mockResolvedValueOnce(conflict as any); // segundo findFirst retorna conflito
    await expect(
      servicoService.editarServico(
        {
          id: 4,
          nome: "New",
          descricao: "B",
          preco: 25,
          foto: null,
          chaveAws: null,
        },
        1,
        null,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });

  it("editarServico mantém foto e chaveAws quando file é null", async () => {
    const existing = {
      id: 6,
      nome: "T",
      descricao: "D",
      preco: 40,
      foto: "old.jpg",
      chaveAws: "oldkey",
      barbeariaId: 9,
    };
    const updated = {
      id: 6,
      nome: "T",
      descricao: "D",
      preco: 40,
      foto: "old.jpg",
      chaveAws: "oldkey",
      barbeariaId: 9,
    };
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({ id: 9 } as any);
    jest
      .mocked(prisma.servico.findFirst)
      .mockResolvedValueOnce(existing as any)
      .mockResolvedValueOnce(null as any);
    jest.mocked(prisma.servico.update).mockResolvedValue(updated as any);
    const resultado = await servicoService.editarServico(
      {
        id: 6,
        nome: "T",
        descricao: "D",
        preco: 40,
        foto: null,
        chaveAws: null,
      },
      1,
      null,
    );
    expect(resultado).toEqual(updated);
  });

  it("deletarServico lança QueryError quando barbearia não encontrada", async () => {
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(null);
    await expect(servicoService.deletarServico(1, 2)).rejects.toBeInstanceOf(
      QueryError,
    );
  });

  it("deletarServico lança QueryError quando serviço não encontrado", async () => {
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({ id: 3 } as any);
    jest.mocked(prisma.servico.findFirst).mockResolvedValue(null);
    await expect(servicoService.deletarServico(2, 3)).rejects.toBeInstanceOf(
      QueryError,
    );
  });

  it("deletarServico lança NotAuthorizedError quando usuário não autorizado", async () => {
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue({ id: 4 } as any);
    jest
      .mocked(prisma.servico.findFirst)
      .mockResolvedValue({
        id: 5,
        nome: "X",
        descricao: "Y",
        preco: 60,
        foto: "f",
        chaveAws: "k",
        barbeariaId: 99,
      } as any);
    await expect(servicoService.deletarServico(5, 4)).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });
});
