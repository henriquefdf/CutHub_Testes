/* eslint-disable @typescript-eslint/no-explicit-any */
import { hash } from "bcrypt";
import prisma from "../../../../config/prismaClient";
import UsuarioService from "./usuarioService";
import { Usuario } from "@prisma/client";
import { QueryError } from "../../../../errors/QueryError";
import { InvalidParamError } from "../../../../errors/InvalidParamError";
import crypto from "crypto";
import { enviaEmail } from "../../../../utils/functions/enviaEmail";
import { deleteObject } from "../../../../utils/functions/aws";

jest.mock("crypto", () => ({
  randomBytes: jest.fn(),
}));

jest.mock("../../../../utils/functions/enviaEmail", () => ({
  enviaEmail: jest.fn(),
}));

jest.mock("../../../../utils/functions/aws", () => ({
  deleteObject: jest.fn(),
}));

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
    expect(await UsuarioService.encryptPassword(password)).toEqual(hashedPassword);
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

    const resultado = await UsuarioService.criar(novoUsuario, {} as Express.Multer.File);
    expect(resultado).toEqual(novoUsuario);
  });

  it("deve lançar QueryError se a criação do usuário falhar durante o upload de foto", async () => {
    const novoUsuario: Usuario = {
      id: 1,
      nome: "Teste",
      email: "test@test.com",
      senha: "password",
      tipo: "cliente",
      foto: "some_photo_url.jpg",
      chaveAws: "some_key",
      tokenRecPass: null,
      dateRecPass: null,
    };
    const mockFile: Express.Multer.File = {
      fieldname: "foto",
      originalname: "test.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 1024,
      destination: "/tmp",
      filename: "test-123.jpg",
      path: "/tmp/test-123.jpg",
      buffer: Buffer.from("dummy image data"),
      stream: null as any,
    };

    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.usuario.create as jest.Mock).mockRejectedValue(new QueryError("Database write failed"));
    (deleteObject as jest.Mock).mockResolvedValue(true);

    await expect(UsuarioService.criar(novoUsuario, mockFile)).rejects.toThrow(QueryError);
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

  it("deve retornar NULL ao tentar obter usuário com id inexistente", async () => {
    (prisma.usuario.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(UsuarioService.getUsuario(999)).resolves.toBeNull();
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

    const resultado = await UsuarioService.updateUsuario(usuarioAtualizado, usuario, {} as Express.Multer.File);
    expect(resultado).toEqual(usuarioAtualizado);
  });

  it("deve atualizar um usuário e remover a foto antiga se uma nova for fornecida", async () => {
    const oldUser: Usuario = {
      id: 1,
      nome: "Old Name",
      email: "old@test.com",
      senha: "password",
      tipo: "cliente",
      foto: "old_photo_url.jpg",
      chaveAws: "old_photo_key",
      tokenRecPass: null,
      dateRecPass: null,
    };

    const updatedUser: Usuario = {
      ...oldUser,
      nome: "New Name",
      foto: "new_photo_url.jpg",
      chaveAws: "new_photo_key",
    };

    const mockNewFile: Express.Multer.File = {
      fieldname: "foto",
      originalname: "new.jpg",
      encoding: "7bit",
      mimetype: "image/jpeg",
      size: 2048,
      destination: "/tmp",
      filename: "new-123.jpg",
      path: "/tmp/new-123.jpg",
      buffer: Buffer.from("new dummy image data"),
      stream: null as any,
    };

    (prisma.usuario.update as jest.Mock).mockResolvedValue(updatedUser);
    (deleteObject as jest.Mock).mockResolvedValue(true);
    const result = await UsuarioService.updateUsuario(updatedUser, oldUser, mockNewFile);

    expect(prisma.usuario.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: oldUser.id },
      data: expect.objectContaining({
        foto: updatedUser.foto,
        chaveAws: updatedUser.chaveAws,
      }),
    }));
    expect(result).toEqual(updatedUser);
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

    const resultado = await UsuarioService.deleteUsuario(usuario);
    expect(resultado).toEqual(usuario);
  });

  it("deve excluir um usuário sem tentar remover foto se não houver", async () => {
    const usuarioSemFoto: Usuario = {
      id: 2,
      nome: "Teste Sem Foto",
      email: "semfoto@test.com",
      senha: "password",
      tipo: "cliente",
      foto: null,
      chaveAws: null,
      tokenRecPass: null,
      dateRecPass: null,
    };

    (prisma.usuario.delete as jest.Mock).mockResolvedValue(usuarioSemFoto);
    (deleteObject as jest.Mock).mockClear();

    await UsuarioService.deleteUsuario(usuarioSemFoto);
    expect(deleteObject).not.toHaveBeenCalled();
    expect(prisma.usuario.delete).toHaveBeenCalledWith({ where: { id: usuarioSemFoto.id } });
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

    it("deve lançar QueryError se o usuário não for encontrado para validação de token", async () => {
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        UsuarioService.validateToken("nonexistent@test.com", "anyToken", "newPass")
      ).rejects.toThrow(InvalidParamError);
    });
  });

  describe("createToken cases", () => {
    it("deve lançar QueryError quando o usuário for null", async () => {
      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(UsuarioService.createToken("nouser@test.com")).rejects.toThrow(QueryError);
    });

    it("deve lançar um erro se a atualização do token no banco de dados falhar", async () => {
      const user: Usuario = {
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

      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(user);
      (crypto.randomBytes as jest.Mock).mockReturnValue(Buffer.from("someToken"));
      (prisma.usuario.update as jest.Mock).mockRejectedValue(new Error("Database update error"));
      (enviaEmail as jest.Mock).mockResolvedValue(true);

      await expect(UsuarioService.createToken(user.email)).rejects.toThrow(Error);
      expect(enviaEmail).not.toHaveBeenCalled();
    });

    it("deve lançar um erro se o envio do e-mail falhar após a criação do token", async () => {
      const user: Usuario = {
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

      (prisma.usuario.findFirst as jest.Mock).mockResolvedValue(user);
      (crypto.randomBytes as jest.Mock).mockReturnValue(Buffer.from("someToken"));
      (prisma.usuario.update as jest.Mock).mockResolvedValue({
        ...user,
        tokenRecPass: "someToken",
        dateRecPass: new Date(),
      });
      (enviaEmail as jest.Mock).mockRejectedValue(new Error("Email sending failed"));

      await expect(UsuarioService.createToken(user.email)).rejects.toThrow(Error);
      expect(prisma.usuario.update).toHaveBeenCalled();
    });
  });
});

export {};
