import agendamentoService from "./agendamentoService";
import { NotAuthorizedError } from "../../../../errors/NotAuthorizedError";
import prisma from "../../../../config/prismaClient";
import { jest } from "@jest/globals";
import { Agendamento, Barbearia, Servico, Usuario } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

jest.mock("../../../../config/prismaClient", () => ({
  servico: {
    findFirst: jest.fn(),
  },
  usuario: {
    findFirst: jest.fn(),
  },
  barbearia: {
    findFirst: jest.fn(),
  },
  agendamento: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
}));

type AgendamentoInterface = Omit<Agendamento, "id"> & {
  id?: number;
  servicoId: number;
};

describe("AgendamentoService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar uma lista de agendamentos do Cliente", async () => {
    const usuario = {
      id: 15,
      nome: "Cliente Teste",
      email: "userteste@gmail.com",
      senha: "123456",
    } as Usuario;

    const agendamentos = [
      {
        id: 4,
        data: new Date(),
        servicoId: 777,
        barbeariaId: 1,
        usuarioId: 15,
      },
      {
        id: 5,
        data: new Date(),
        servicoId: 25,
        barbeariaId: 177,
        usuarioId: 15,
      },
    ] as Agendamento[];

    jest.mocked(prisma.usuario.findFirst).mockResolvedValue(usuario);
    jest.mocked(prisma.agendamento.findMany).mockResolvedValue(agendamentos);

    const resultado = await agendamentoService.listarAgendamentosCliente(
      15,
      "0",
    );
    console.log(resultado);
    expect(resultado).toEqual(agendamentos);
  });

  it("deve criar um novo agendamento", async () => {
    const body = {
      data: new Date(),
      servicoId: 1,
    } as AgendamentoInterface;

    const servico = {
      id: 1,
      nome: "Corte",
      descricao: "Descrição do serviço",
      preco: 50,
      foto: null,
      chaveAws: null,
      barbeariaId: 1,
    } as Servico;
    const barbearia = {
      id: 1,
      nome: "Barbearia do Teste",
      endereco: "Rua dos Testes, 123",
      foto: "http://exemplo.com/foto.jpg",
      chaveAws: "chave-s3",
      usuarioId: 1,
    } as Barbearia;

    const agendamento = {
      id: 1,
      data: body.data,
      servicoId: body.servicoId,
      barbeariaId: barbearia.id,
      usuarioId: 1,
    } as Agendamento;

    jest.mocked(prisma.servico.findFirst).mockResolvedValue(servico);
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(barbearia);
    jest.mocked(prisma.agendamento.findFirst).mockResolvedValue(null);
    jest.mocked(prisma.agendamento.create).mockResolvedValue(agendamento);

    const resultado = await agendamentoService.criarAgendamento(body, 1);
    expect(resultado).toEqual(agendamento);
  });

  it("deve retornar erro se a barbearia não for encontrada", async () => {
    const body = {
      data: new Date(),
      servicoId: 1,
    } as AgendamentoInterface;

    const servico = {
      id: 1,
      nome: "Corte",
      descricao: "Descrição do serviço",
      preco: 50,
      foto: null,
      chaveAws: null,
      barbeariaId: 1,
    } as Servico;

    jest.mocked(prisma.servico.findFirst).mockResolvedValue(servico);
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(null);

    await expect(agendamentoService.criarAgendamento(body, 1)).rejects.toThrow(
      new NotAuthorizedError("Barbearia não encontrada."),
    );
  });

  it("deve retornar erro se já existir um agendamento nesse horário", async () => {
    const body = {
      data: new Date(),
      servicoId: 1,
    } as AgendamentoInterface;

    const servico = {
      id: 1,
      nome: "Corte",
      descricao: "Descrição do serviço",
      preco: 50,
      foto: null,
      chaveAws: null,
      barbeariaId: 1,
    } as Servico;
    const barbearia = {
      id: 1,
      nome: "Barbearia do Teste",
      endereco: "Rua dos Testes, 123",
      foto: "http://exemplo.com/foto.jpg",
      chaveAws: "chave-s3",
      usuarioId: 1,
    } as Barbearia;

    const agendamento = {
      id: 1,
      data: body.data,
      servicoId: body.servicoId,
      barbeariaId: barbearia.id,
      usuarioId: 1,
    } as Agendamento;

    jest.mocked(prisma.servico.findFirst).mockResolvedValue(servico);
    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(barbearia);
    jest.mocked(prisma.agendamento.findFirst).mockResolvedValue(agendamento);

    await expect(agendamentoService.criarAgendamento(body, 1)).rejects.toThrow(
      new NotAuthorizedError("Já existe um agendamento nesse horário."),
    );
  });

  it("deve retornar uma lista de agendamentos da Barbearia", async () => {
    const barbearia = {
      id: 1,
      nome: "Barbearia do Teste",
      endereco: "Rua dos Testes, 123",
      foto: "http://exemplo.com/foto.jpg",
      chaveAws: "chave-s3",
      usuarioId: 1,
    } as Barbearia;
    const agendamentos = [
      {
        id: 1,
        data: new Date(),
        servicoId: 1,
        barbeariaId: 1,
        usuarioId: 1,
      },
      {
        id: 2,
        data: new Date(),
        servicoId: 2,
        barbeariaId: 1,
        usuarioId: 1,
      },
    ] as Agendamento[];

    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(barbearia);
    jest.mocked(prisma.agendamento.findMany).mockResolvedValue(agendamentos);

    const resultado = await agendamentoService.listarAgendamentosBarbearia(1);
    expect(resultado).toEqual(agendamentos);
  });

  it("deve deletar um agendamento", async () => {
    const barbearia = {
      id: 1,
      nome: "Barbearia do Teste",
      endereco: "Rua dos Testes, 123",
      foto: "http://exemplo.com/foto.jpg",
      chaveAws: "chave-s3",
      usuarioId: 1,
    } as Barbearia;

    const agendamento = {
      id: 1,
      data: new Date(),
      servicoId: 1,
      barbeariaId: 1,
      usuarioId: 1,
    } as Agendamento;

    jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(barbearia);
    jest.mocked(prisma.agendamento.findFirst).mockResolvedValue(agendamento);
    jest.mocked(prisma.agendamento.delete).mockResolvedValue(agendamento);

    const resultado = await agendamentoService.deletarAgendamento(1, 1);
    expect(resultado).toEqual(agendamento);
  });

  describe("criarAgendamento", () => {
    it("deve criar um novo agendamento com sucesso", async () => {
      const body = {
        data: new Date("2025-06-10T10:00:00Z"),
        servicoId: 1,
      } as AgendamentoInterface;
      const servico = { id: 1, barbeariaId: 5 } as any;
      const barbearia = { id: 5 } as any;
      const agendamentoCriado = {
        id: 100,
        data: body.data,
        servicoId: 1,
        barbeariaId: 5,
        usuarioId: 42,
      } as any;

      jest.mocked(prisma.servico.findFirst).mockResolvedValue(servico);
      jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(barbearia);
      jest.mocked(prisma.agendamento.findFirst).mockResolvedValue(null);
      jest
        .mocked(prisma.agendamento.create)
        .mockResolvedValue(agendamentoCriado);

      const resultado = await agendamentoService.criarAgendamento(body, 42);
      expect(prisma.servico.findFirst).toHaveBeenCalledWith({
        where: { id: +body.servicoId },
      });
      expect(prisma.barbearia.findFirst).toHaveBeenCalledWith({
        where: { servicos: { some: { id: +body.servicoId } } },
      });
      expect(prisma.agendamento.findFirst).toHaveBeenCalledWith({
        where: { data: body.data, barbeariaId: barbearia.id },
      });
      expect(prisma.agendamento.create).toHaveBeenCalledWith({
        data: {
          data: body.data,
          servicoId: +body.servicoId,
          barbeariaId: barbearia.id,
          usuarioId: 42,
        },
      });
      expect(resultado).toEqual(agendamentoCriado);
    });

    it("deve lançar NotAuthorizedError quando serviço não encontrado", async () => {
      const body = { data: new Date(), servicoId: 99 } as AgendamentoInterface;
      jest.mocked(prisma.servico.findFirst).mockResolvedValue(null);
      await expect(
        agendamentoService.criarAgendamento(body, 1),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("deve lançar NotAuthorizedError quando barbearia não encontrada", async () => {
      const body = { data: new Date(), servicoId: 2 } as AgendamentoInterface;
      const servico = { id: 2, barbeariaId: 7 } as any;
      jest.mocked(prisma.servico.findFirst).mockResolvedValue(servico);
      jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(null);
      await expect(
        agendamentoService.criarAgendamento(body, 1),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("deve lançar NotAuthorizedError quando já existir agendamento no mesmo horário", async () => {
      const body = {
        data: new Date("2025-06-11T12:00:00Z"),
        servicoId: 3,
      } as AgendamentoInterface;
      const servico = { id: 3, barbeariaId: 9 } as any;
      const barbearia = { id: 9 } as any;
      const agendamentoExistente = {
        id: 55,
        data: body.data,
        servicoId: 3,
        barbeariaId: 9,
      } as any;

      jest.mocked(prisma.servico.findFirst).mockResolvedValue(servico);
      jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(barbearia);
      jest
        .mocked(prisma.agendamento.findFirst)
        .mockResolvedValue(agendamentoExistente);

      await expect(
        agendamentoService.criarAgendamento(body, 1),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("listarAgendamentosCliente", () => {
    it("deve retornar agendamentos futuros quando finalizado = '0'", async () => {
      const now = new Date("2025-06-01T00:00:00Z");
      jest.useFakeTimers().setSystemTime(now);
      const agendamentos = [
        {
          id: 10,
          data: new Date("2025-06-05T09:00:00Z"),
          servicoId: 1,
          barbeariaId: 1,
          usuarioId: 5,
        },
      ] as any[];

      jest.mocked(prisma.agendamento.findMany).mockResolvedValue(agendamentos);
      jest
        .mocked(prisma.servico.findFirst)
        .mockResolvedValue({ id: 1, nome: "X" } as any);
      jest
        .mocked(prisma.barbearia.findFirst)
        .mockResolvedValue({ id: 1, nome: "Y" } as any);

      const resultado = await agendamentoService.listarAgendamentosCliente(
        5,
        "0",
      );

      expect(prisma.agendamento.findMany).toHaveBeenCalledWith({
        where: { usuarioId: 5, data: { gte: now } },
        orderBy: { data: "asc" },
      });
      expect(resultado).toEqual([
        {
          ...agendamentos[0],
          servico: { id: 1, nome: "X" },
          barbearia: { id: 1, nome: "Y" },
        },
      ]);
      jest.useRealTimers();
    });

    it("deve retornar agendamentos passados quando finalizado = '1'", async () => {
      const now = new Date("2025-06-01T00:00:00Z");
      jest.useFakeTimers().setSystemTime(now);
      const agendamentos = [
        {
          id: 20,
          data: new Date("2025-05-01T10:00:00Z"),
          servicoId: 2,
          barbeariaId: 2,
          usuarioId: 6,
        },
      ] as any[];

      jest.mocked(prisma.agendamento.findMany).mockResolvedValue(agendamentos);
      jest
        .mocked(prisma.servico.findFirst)
        .mockResolvedValue({ id: 2, nome: "A" } as any);
      jest
        .mocked(prisma.barbearia.findFirst)
        .mockResolvedValue({ id: 2, nome: "B" } as any);

      const resultado = await agendamentoService.listarAgendamentosCliente(
        6,
        "1",
      );

      expect(prisma.agendamento.findMany).toHaveBeenCalledWith({
        where: { usuarioId: 6, data: { lte: now } },
        orderBy: { data: "desc" },
      });
      expect(resultado).toEqual([
        {
          ...agendamentos[0],
          servico: { id: 2, nome: "A" },
          barbearia: { id: 2, nome: "B" },
        },
      ]);
      jest.useRealTimers();
    });
  });

  describe("listarAgendamentosBarbearia", () => {
    it("deve retornar agendamentos da barbearia quando encontrada", async () => {
      const barbearia = { id: 7, usuarioId: 8 } as any;
      const agendamentos = [
        {
          id: 30,
          data: new Date(),
          servicoId: 5,
          barbeariaId: 7,
          usuarioId: 9,
        },
      ] as any[];

      jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(barbearia);
      jest.mocked(prisma.agendamento.findMany).mockResolvedValue(agendamentos);

      const resultado = await agendamentoService.listarAgendamentosBarbearia(8);
      expect(prisma.barbearia.findFirst).toHaveBeenCalledWith({
        where: { usuarioId: 8 },
      });
      expect(prisma.agendamento.findMany).toHaveBeenCalledWith({
        where: { barbeariaId: 7 },
      });
      expect(resultado).toEqual(agendamentos);
    });

    it("deve lançar NotAuthorizedError quando barbearia não encontrada", async () => {
      jest.mocked(prisma.barbearia.findFirst).mockResolvedValue(null);
      await expect(
        agendamentoService.listarAgendamentosBarbearia(99),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("deletarAgendamento", () => {
    it("deve deletar agendamento quando encontrado e usuário autorizado", async () => {
      const agendamento = {
        id: 40,
        data: new Date(),
        servicoId: 6,
        barbeariaId: 3,
        usuarioId: 10,
      } as any;

      jest.mocked(prisma.agendamento.findFirst).mockResolvedValue(agendamento);
      jest.mocked(prisma.agendamento.delete).mockResolvedValue(agendamento);

      const resultado = await agendamentoService.deletarAgendamento(40, 10);
      expect(prisma.agendamento.findFirst).toHaveBeenCalledWith({
        where: { id: 40 },
      });
      expect(prisma.agendamento.delete).toHaveBeenCalledWith({
        where: { id: 40 },
      });
      expect(resultado).toEqual(agendamento);
    });

    it("deve lançar NotAuthorizedError quando agendamento não encontrado", async () => {
      jest.mocked(prisma.agendamento.findFirst).mockResolvedValue(null);
      await expect(
        agendamentoService.deletarAgendamento(50, 20),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });

    it("deve lançar NotAuthorizedError quando usuário não autorizado a deletar", async () => {
      const ag = {
        id: 60,
        data: new Date(),
        servicoId: 7,
        barbeariaId: 4,
        usuarioId: 30,
      } as any;
      jest.mocked(prisma.agendamento.findFirst).mockResolvedValue(ag);
      await expect(
        agendamentoService.deletarAgendamento(60, 99),
      ).rejects.toBeInstanceOf(NotAuthorizedError);
    });
  });

  describe("listarAgendamentosBarbeariaData", () => {
    it("deve retornar agendamentos filtrados pela data corretamente", async () => {
      const baseDate = new Date("2025-07-15T00:00:00Z");
      const agendamentos = [
        {
          id: 70,
          data: new Date("2025-07-15T09:00:00Z"),
          servicoId: 8,
          barbeariaId: 11,
          usuarioId: 12,
        },
        {
          id: 71,
          data: new Date("2025-07-15T18:00:00Z"),
          servicoId: 9,
          barbeariaId: 11,
          usuarioId: 13,
        },
      ] as any[];

      jest.mocked(prisma.agendamento.findMany).mockResolvedValue(agendamentos);

      const resultado =
        await agendamentoService.listarAgendamentosBarbeariaData(
          "11",
          baseDate,
        );

      expect(prisma.agendamento.findMany).toHaveBeenCalledWith({
        where: {
          barbeariaId: 11,
          data: {
            lte: endOfDay(baseDate),
            gte: startOfDay(baseDate),
          },
        },
      });
      expect(resultado).toEqual(agendamentos);
    });
  });
});
