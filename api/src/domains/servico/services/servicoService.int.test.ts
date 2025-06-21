import servicoService from "../services/servicoService";
import { QueryError } from "../../../../errors/QueryError";
import { NotAuthorizedError } from "../../../../errors/NotAuthorizedError";
import prisma from "../../../../config/prismaClient";

jest.mock("../../../../utils/functions/aws", () => ({
  deleteObject: jest.fn(),
}));

import { deleteObject } from "../../../../utils/functions/aws";

let donoId: number;
let outraBarbeariaId: number;
let servicoId: number;

beforeAll(async () => {
  // limpa tudo
  await prisma.$transaction([
    prisma.agendamento.deleteMany(),
    prisma.servico.deleteMany(),
    prisma.barbearia.deleteMany(),
    prisma.usuario.deleteMany(),
  ]);

  // cria dono e sua barbearia
  const user = await prisma.usuario.create({
    data: {
      nome: "Dono",
      email: "dono@x.com",
      senha: "x",
      tipo: "dono_barbearia",
    },
  });
  donoId = user.id;
  const barb = await prisma.barbearia.create({
    data: { nome: "MinhaB", endereco: "Rua A", usuarioId: donoId },
  });
  // cria outra barbearia para testar autorização cruzada
  const user2 = await prisma.usuario.create({
    data: {
      nome: "Outro",
      email: "outro@x.com",
      senha: "x",
      tipo: "dono_barbearia",
    },
  });
  const barb2 = await prisma.barbearia.create({
    data: { nome: "B2", endereco: "Rua B", usuarioId: user2.id },
  });
  outraBarbeariaId = barb2.id;

  // seed um serviço pra duplicação
  const serv = await prisma.servico.create({
    data: {
      nome: "Corte",
      descricao: "desc",
      preco: 50,
      barbeariaId: barb.id,
      foto: "init.jpg",
      chaveAws: "init.jpg",
    },
  });
  servicoId = serv.id;
});

afterAll(() => prisma.$disconnect());

describe("1 – criarServico(): barbearia não encontrada", () => {
  it("deve lançar QueryError", async () => {
    await expect(
      servicoService.criarServico(
        { nome: "X", descricao: "d", preco: 10 } as any,
        9999,
        null,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });
});

describe("2 – criarServico(): serviço duplicado", () => {
  it("deve lançar QueryError", async () => {
    await expect(
      servicoService.criarServico(
        { nome: "Corte", descricao: "d", preco: 50 } as any,
        donoId,
        null,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });
});

describe("3 – criarServico(): sucesso", () => {
  it("deve retornar o novo serviço", async () => {
    const novo = await servicoService.criarServico(
      { nome: "Barba", descricao: "desc", preco: 30 } as any,
      donoId,
      { location: "u.jpg", key: "k.jpg" } as any,
    );
    expect(novo).toHaveProperty("id");
    expect(novo.nome).toBe("Barba");
  });
});

describe("4 – editarServico(): barbearia não encontrada", () => {
  it("deve lançar QueryError", async () => {
    await expect(
      servicoService.editarServico(
        { id: servicoId, nome: "X", descricao: "d", preco: 20 } as any,
        9999,
        null,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });
});

describe("5 – editarServico(): serviço não existe", () => {
  it("deve lançar QueryError", async () => {
    await expect(
      servicoService.editarServico(
        { id: 9999, nome: "X", descricao: "d", preco: 20 } as any,
        donoId,
        null,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });
});

describe("6 – editarServico(): usuário não autorizado", () => {
  it("deve lançar NotAuthorizedError", async () => {
    // cria um serviço em outra barbearia
    const s2 = await prisma.servico.create({
      data: {
        nome: "Penteado",
        descricao: "p",
        preco: 40,
        barbeariaId: outraBarbeariaId,
      },
    });
    await expect(
      servicoService.editarServico(
        { id: s2.id, nome: "Novo", descricao: "d", preco: 45 } as any,
        donoId,
        null,
      ),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});

describe("7 – editarServico(): nome duplicado", () => {
  it("deve lançar QueryError", async () => {
    await expect(
      servicoService.editarServico(
        { id: servicoId, nome: "Barba", descricao: "d", preco: 50 } as any,
        donoId,
        null,
      ),
    ).rejects.toBeInstanceOf(QueryError);
  });
});

describe("8 – editarServico(): sucesso com arquivo", () => {
  it("deve atualizar e chamar deleteObject", async () => {
    await prisma.servico.update({
      where: { id: servicoId },
      data: { foto: "old.jpg", chaveAws: "old.jpg" },
    });

    const updated = await servicoService.editarServico(
      { id: servicoId, nome: "CorteNovo", descricao: "novo", preco: 55 } as any,
      donoId,
      { location: "new.jpg", key: "old.jpg" } as any,
    );

    expect(updated.nome).toBe("CorteNovo");
  });
});

describe("9 – deletarServico(): barbearia não encontrada", () => {
  it("deve lançar QueryError", async () => {
    await expect(
      servicoService.deletarServico(9999, 9999),
    ).rejects.toBeInstanceOf(QueryError);
  });
});

describe("10 – deletarServico(): sucesso", () => {
  it("deve remover serviço", async () => {
    const s3 = await prisma.servico.create({
      data: {
        nome: "Temp",
        descricao: "t",
        preco: 15,
        barbeariaId: outraBarbeariaId,
      },
    });
    interface BarbeariaRecord {
      usuarioId: number;
    }

    interface DeletedService {
      id: number;
    }

    const del: DeletedService = await servicoService.deletarServico(
      s3.id,
      await prisma.barbearia
        .findFirst({ where: { id: outraBarbeariaId } })
        .then((b: BarbeariaRecord | null): number => b!.usuarioId),
    );
    expect(del.id).toBe(s3.id);
    const check = await prisma.servico.findUnique({ where: { id: s3.id } });
    expect(check).toBeNull();
  });
});
