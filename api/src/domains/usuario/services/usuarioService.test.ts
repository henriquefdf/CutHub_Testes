import { hash } from "bcrypt";
import prisma from "../../../../config/prismaClient";
import UsuarioService from "./usuarioService";
import { Usuario } from "@prisma/client";
import { QueryError } from "../../../../errors/QueryError";
import { InvalidParamError } from "../../../../errors/InvalidParamError";
import crypto from "crypto";
import { enviaEmail } from "../../../../utils/functions/enviaEmail";
import { deleteObject } from "../../../../utils/functions/aws";

jest.mock("../../../../config/prismaClient", () => ({
  usuario: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock da função hash do bcrypt
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword"),
}));

describe("UsuarioService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("criptografa uma senha", async () => {
    const password = "password";
    const hashedPassword = await hash(password, 10);
    expect(await UsuarioService.encryptPassword(password)).toEqual(
      hashedPassword,
    );
  });

  it("cria um novo usuário", async () => {
    const novoUsuario: Usuario = {
      id: 1,
      nome: "Teste",
      email: "test@test.com",
      senha: "password",
      tipo: "cliente",
      foto: null,
      chaveAws: null,
      tokenRecPass: null,
      dateRecPass: null,
    };

    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.usuario.create as jest.Mock).mockResolvedValue(novoUsuario);

    const resultado = await UsuarioService.criar(
      novoUsuario,
      {} as Express.Multer.File,
    ); // Pass an empty object as the second argument
    expect(resultado).toEqual(novoUsuario);
  });

  it("obtém um usuário pelo id", async () => {
    const usuario: Usuario = {
      id: 1,
      nome: "Teste",
      email: "test@test.com",
      senha: "password",
      tipo: "cliente",
      foto: null,
      chaveAws: null,
      tokenRecPass: null,
      dateRecPass: null,
    };

    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(usuario);

    const resultado = await UsuarioService.getUsuario(1);
    expect(resultado).toEqual(usuario);
  });

  it("obtém uma lista de usuários", async () => {
    const usuarios: Usuario[] = [
      {
        id: 1,
        nome: "Teste",
        email: "test@test.com",
        senha: "password",
        tipo: "cliente",
        foto: null,
        chaveAws: null,
        tokenRecPass: null,
        dateRecPass: null,
      },
      {
        id: 2,
        nome: "Teste 2",
        email: "test2@test.com",
        senha: "password2",
        tipo: "cliente",
        foto: null,
        chaveAws: null,
        tokenRecPass: null,
        dateRecPass: null,
      },
    ];

    (prisma.usuario.findMany as jest.Mock).mockResolvedValue(usuarios);

    const resultado = await UsuarioService.getListaUsuarios();
    expect(resultado).toEqual(usuarios);
  });

  it("atualiza um usuário", async () => {
    const usuario: Usuario = {
      id: 1,
      nome: "Teste",
      email: "test@test.com",
      senha: "password",
      tipo: "cliente",
      foto: null,
      chaveAws: null,
      tokenRecPass: null,
      dateRecPass: null,
    };

    const usuarioAtualizado: Usuario = {
      ...usuario,
      nome: "Teste Atualizado",
    };

    (prisma.usuario.update as jest.Mock).mockResolvedValue(usuarioAtualizado);

    const resultado = await UsuarioService.updateUsuario(
      usuarioAtualizado,
      usuario,
      {} as Express.Multer.File,
    ); 
    expect(resultado).toEqual(usuarioAtualizado);
  });

  it("exclui um usuário", async () => {
    const usuario: Usuario = {
      id: 1,
      nome: "Teste",
      email: "test@test.com",
      senha: "password",
      tipo: "cliente",
      foto: null,
      chaveAws: null,
      tokenRecPass: null,
      dateRecPass: null,
    };

    (prisma.usuario.delete as jest.Mock).mockResolvedValue(usuario);

    const resultado = await UsuarioService.deleteUsuario(usuario); // Pass the required argument
    expect(resultado).toEqual(usuario);
  });

  it("atualiza a senha de um usuário", async () => {
    const usuario: Usuario = {
      id: 1,
      nome: "Teste",
      email: "test@test.com",
      senha: "password",
      tipo: "cliente",
      foto: null,
      chaveAws: null,
      tokenRecPass: null,
      dateRecPass: null,
    };

    const novaSenha = "novaSenha";
    const senhaCriptografada = await hash(novaSenha, 10);

    (prisma.usuario.update as jest.Mock).mockResolvedValue({
      ...usuario,
      senha: senhaCriptografada,
    });

    await UsuarioService.updatePassword(novaSenha, usuario.id);
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: usuario.id },
      data: { senha: senhaCriptografada },
    });
  });

    describe("criar error case", () => {
    it("deve lançar QueryError quando já existir usuário com o mesmo e-mail", async () => {
      const existingUser = { id: 1, email: "test@test.com" };
      (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const body = {
        id: 1,
        nome: "Teste",
        email: "test@test.com",
        senha: "password",
        tipo: "cliente",
        foto: null,
        chaveAws: null,
        tokenRecPass: null,
        dateRecPass: null,
      };
      await expect(UsuarioService.criar(body as any, null as any)).rejects.toThrow(QueryError);
    });
  });

  describe("validateToken cases", () => {
    it("deve lançar InvalidParamError se o token não bater", async () => {
      const user = {
        id: 1,
        email: "user@test.com",
        tokenRecPass: "correctToken",
        dateRecPass: null,
      };
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(user);

      await expect(
        UsuarioService.validateToken("user@test.com", "wrongToken", "pass")
      ).rejects.toThrow(InvalidParamError);
    });

    it("deve lançar InvalidParamError se o token já estiver expirado", async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2);
      const user = {
        id: 2,
        email: "user2@test.com",
        tokenRecPass: "token123",
        dateRecPass: pastDate,
      };
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(user);

      await expect(
        UsuarioService.validateToken("user2@test.com", "token123", "pass")
      ).rejects.toThrow(InvalidParamError);
    });

    it("deve chamar updatePassword quando o token for válido e não expirado", async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);
      const user = {
        id: 3,
        email: "user3@test.com",
        tokenRecPass: "tokenValid",
        dateRecPass: futureDate,
      };
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(user);

      const updateSpy = jest
        .spyOn(UsuarioService, "updatePassword")
        .mockResolvedValue(Promise.resolve());

      await expect(
        UsuarioService.validateToken("user3@test.com", "tokenValid", "newPass")
      ).resolves.toBeUndefined();
      expect(updateSpy).toHaveBeenCalledWith("newPass", user.id);
    });
  });

  describe("createToken cases", () => {
    it("deve lançar QueryError quando o usuário for null", async () => {
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(UsuarioService.createToken("nouser@test.com")).rejects.toThrow(QueryError);
    });

  });

});

export {}; // Para evitar erros de "Cannot redeclare block-scoped variable" no TypeScript
