import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type Any = Record<string, any>;
const i = (v: any, d: number) => {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

@Controller('clients')
export class ClientsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('search')
  async search(@Query('page') pageQ?: string, @Query('limit') limitQ?: string,
               @Query('q') q?: string, @Query('sort') sort?: string) {
    const page  = i(pageQ, 1);
    const limit = [10,20,50].includes(i(limitQ, 20)) ? i(limitQ, 20) : 20;
    const off   = (page - 1) * limit;
    const qLike = (q ?? '').trim();

    const order =
      sort === 'name'  ? 'name ASC'  :
      sort === '-name' ? 'name DESC' :
      sort === 'id'    ? 'id ASC'    :
      sort === '-id'   ? 'id DESC'   : 'name ASC';

    const where = qLike
      ? `WHERE (c.name ILIKE $1 OR c.cuit ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1)`
      : '';

    const params: any[] = [];
    if (qLike) params.push(`%${qLike}%`);

    const totalRow = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS total FROM cmr."Client" c ${where}`, ...params
    );
    const total = totalRow[0]?.total ?? 0;

    const items = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
         c.id,
         COALESCE(c.name,'')          AS nombre,
         COALESCE(c.cuit,'')          AS cuit,
         COALESCE(c.address,'')       AS direccion,
         COALESCE(c.payment_terms,'') AS "condicionesPago",
         COALESCE(c.email,'')         AS email,
         COALESCE(c.phone,'')         AS telefono
       FROM cmr."Client" c
       ${where}
       ORDER BY ${order}
       LIMIT $${params.length+1} OFFSET $${params.length+2}`,
       ...params, limit, off
    );

    return { items, page, total, pages: Math.max(1, Math.ceil(total/limit)) };
  }

  @Get()
  async listAll() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
         c.id,
         COALESCE(c.name,'')          AS nombre,
         COALESCE(c.cuit,'')          AS cuit,
         COALESCE(c.address,'')       AS direccion,
         COALESCE(c.payment_terms,'') AS "condicionesPago",
         COALESCE(c.email,'')         AS email,
         COALESCE(c.phone,'')         AS telefono
       FROM cmr."Client" c
       ORDER BY name ASC`
    );
    return { items: rows, total: rows.length };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const oid = Number(id);
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
         c.id,
         COALESCE(c.name,'')          AS nombre,
         COALESCE(c.cuit,'')          AS cuit,
         COALESCE(c.address,'')       AS direccion,
         COALESCE(c.payment_terms,'') AS "condicionesPago",
         COALESCE(c.email,'')         AS email,
         COALESCE(c.phone,'')         AS telefono
       FROM cmr."Client" c
       WHERE c.id=$1`, oid
    );
    return rows[0] ?? null;
  }

  @Post()
  async create(@Body() b: Any) {
    const data = {
      name: (b.nombre ?? '').trim(),
      cuit: b.cuit ?? '',
      address: b.direccion ?? '',
      payment_terms: b.condicionesPago ?? '',
      email: b.email ?? '',
      phone: b.telefono ?? '',
    };
    const ins = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO cmr."Client"(name,cuit,address,payment_terms,email,phone)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name AS nombre, cuit, address AS direccion, payment_terms AS "condicionesPago", email, phone AS telefono`,
       data.name, data.cuit, data.address, data.payment_terms, data.email, data.phone
    );
    return ins[0];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() b: Any) {
    const oid = Number(id);
    const data = {
      name: (b.nombre ?? '').trim(),
      cuit: b.cuit ?? '',
      address: b.direccion ?? '',
      payment_terms: b.condicionesPago ?? '',
      email: b.email ?? '',
      phone: b.telefono ?? '',
    };
    const up = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE cmr."Client"
         SET name=$1,cuit=$2,address=$3,payment_terms=$4,email=$5,phone=$6
       WHERE id=$7
       RETURNING id, name AS nombre, cuit, address AS direccion, payment_terms AS "condicionesPago", email, phone AS telefono`,
       data.name, data.cuit, data.address, data.payment_terms, data.email, data.phone, oid
    );
    return up[0] ?? null;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const oid = Number(id);
    await this.prisma.$queryRawUnsafe(`DELETE FROM cmr."Client" WHERE id=$1`, oid);
    return { ok: true };
  }
}