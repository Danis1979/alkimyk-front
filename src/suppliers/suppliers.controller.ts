import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type Any = Record<string, any>;
const i = (v: any, d: number) => { const n = parseInt(String(v ?? ''),10); return Number.isFinite(n)&&n>0?n:d; };

@Controller('suppliers')
export class SuppliersController {
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
      ? `WHERE (s.name ILIKE $1 OR s.cuit ILIKE $1 OR s.email ILIKE $1 OR s.phone ILIKE $1)`
      : '';
    const params:any[] = [];
    if (qLike) params.push(`%${qLike}%`);

    const totalRow = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS total FROM cmr."Supplier" s ${where}`, ...params
    );
    const total = totalRow[0]?.total ?? 0;

    const items = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
         s.id,
         COALESCE(s.name,'')    AS nombre,
         COALESCE(s.cuit,'')    AS cuit,
         COALESCE(s.address,'') AS direccion,
         COALESCE(s.email,'')   AS email,
         COALESCE(s.phone,'')   AS telefono
       FROM cmr."Supplier" s
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
         s.id,
         COALESCE(s.name,'')    AS nombre,
         COALESCE(s.cuit,'')    AS cuit,
         COALESCE(s.address,'') AS direccion,
         COALESCE(s.email,'')   AS email,
         COALESCE(s.phone,'')   AS telefono
       FROM cmr."Supplier" s
       ORDER BY name ASC`
    );
    return { items: rows, total: rows.length };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const oid = Number(id);
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
         s.id,
         COALESCE(s.name,'')    AS nombre,
         COALESCE(s.cuit,'')    AS cuit,
         COALESCE(s.address,'') AS direccion,
         COALESCE(s.email,'')   AS email,
         COALESCE(s.phone,'')   AS telefono
       FROM cmr."Supplier" s
       WHERE s.id=$1`, oid
    );
    return rows[0] ?? null;
  }

  @Post()
  async create(@Body() b: Any) {
    const data = {
      name: (b.nombre ?? b.name ?? '').trim(),
      cuit: b.cuit ?? '',
      address: b.direccion ?? '',
      email: b.email ?? '',
      phone: b.telefono ?? '',
    };
    const ins = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO cmr."Supplier"(name,cuit,address,email,phone)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name AS nombre, cuit, address AS direccion, email, phone AS telefono`,
      data.name, data.cuit, data.address, data.email, data.phone
    );
    return ins[0];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() b: Any) {
    const oid = Number(id);
    const data = {
      name: (b.nombre ?? b.name ?? '').trim(),
      cuit: b.cuit ?? '',
      address: b.direccion ?? '',
      email: b.email ?? '',
      phone: b.telefono ?? '',
    };
    const up = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE cmr."Supplier"
         SET name=$1, cuit=$2, address=$3, email=$4, phone=$5
       WHERE id=$6
       RETURNING id, name AS nombre, cuit, address AS direccion, email, phone AS telefono`,
      data.name, data.cuit, data.address, data.email, data.phone, oid
    );
    return up[0] ?? null;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const oid = Number(id);
    await this.prisma.$queryRawUnsafe(`DELETE FROM cmr."Supplier" WHERE id=$1`, oid);
    return { ok: true };
  }
}