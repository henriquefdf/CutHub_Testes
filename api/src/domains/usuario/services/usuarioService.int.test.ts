import request from 'supertest'
import { app } from '../../../../config/expressConfig';
import prisma from "../../../../config/prismaClient";
import { TipoUsuario } from '@prisma/client'

let token: string
let userId: number
let recoveryToken: string

jest.mock('../../../../utils/functions/enviaEmail', () => ({
  enviaEmail: jest.fn().mockResolvedValue(undefined),
}));

beforeAll(async () => {
  // garante o banco limpo
  await prisma.$transaction([
    prisma.agendamento.deleteMany(),
    prisma.servico.deleteMany(),
    prisma.barbearia.deleteMany(),
    prisma.usuario.deleteMany(),
  ])
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Usuario – integração', () => {
  it('1 – cria usuário sem foto', async () => {
    const res = await request(app)
      .post('/api/usuarios/criar')
      .field('nome', 'Ana')
      .field('email', 'ana@test.com')
      .field('senha', '123456')
      .field('tipo', TipoUsuario.cliente)
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    userId = res.body.id
  });

  it('2 – não cria usuário com email duplicado', async () => {
    const res = await request(app)
      .post('/api/usuarios/criar')
      .field('nome', 'Ana2')
      .field('email', 'ana@test.com')
      .field('senha', 'abcdef')
      .field('tipo', TipoUsuario.cliente)
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/Email já cadastrado./)
  })

  it('3 – faz login e obtém JWT', async () => {
    const res = await request(app)
      .post('/api/usuarios/login')
      .send({ email: 'ana@test.com', senha: '123456' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    token = res.headers['set-cookie'];
  })

  it('4 – GET /minhaconta retorna dados do usuário', async () => {
    const res = await request(app)
      .get('/api/usuarios/minhaconta')
      .set('Cookie', token); 
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('ana@test.com')
  })

  it('5 – PUT /atualizar muda nome e senha', async () => {
    const res = await request(app)
      .put('/api/usuarios/atualizar')
      .set('Cookie', token)
      .field('nome', 'Ana Atualizada')
      .field('senha', 'novasenha')
    expect(res.status).toBe(200)
    expect(res.body.nome).toBe('Ana Atualizada')
  })

  it('6 – POST /enviaToken falha com email inexiste', async () => {
    const res = await request(app)
      .post('/api/usuarios/enviaToken')
      .send({ email: 'xxx@x.com' })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/válido/)
  })

  it('7 – fluxo de recuperação de senha: enviaToken + validaToken', async () => {
    const r1 = await request(app)
      .post('/api/usuarios/enviaToken')
      .send({ email: 'ana@test.com' })
    expect(r1.status).toBe(200)

    const u = await prisma.usuario.findUnique({ where: { email: 'ana@test.com' }})
    recoveryToken = u!.tokenRecPass!

    const r2 = await request(app)
      .post('/api/usuarios/validaToken')
      .send({
        email: 'ana@test.com',
        token: recoveryToken,
        senha: 'senhaRecuperada'
      })
    expect(r2.status).toBe(200)
    expect(typeof r2.text).toBe('string')

    const r3 = await request(app)
      .post('/api/usuarios/login')
      .send({ email: 'ana@test.com', senha: 'senhaRecuperada' })
    expect(r3.status).toBe(200)
    expect(r3.body).toHaveProperty('token')
  })

  it('8 – DELETE /deletar remove usuário', async () => {
    const res = await request(app)
      .delete('/api/usuarios/deletar')
      .set('Cookie', token);
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/deletado com sucesso/)

    const u = await prisma.usuario.findUnique({ where: { id: userId }})
    expect(u).toBeNull()
  })
})
