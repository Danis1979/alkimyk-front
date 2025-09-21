import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type AnyObj = Record<string, any>;
function toInt(v: any, d: number) { const n = parseInt(String(v ?? ''), 10); return Number.isFinite(n) && n > 0 ? n : d; }

@Controller('products')
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('search')
  async search(@Query('page') pageQ?: string, @Query('limit') limitQ?: string, @Query('q') q?: string, @Query('sort') sort?: string) {
    const page  = toInt(pageQ, 1);
    const limit = [10,20,50].includes(toInt(limitQ, 20)) ? toInt(limitQ, 20) : 20;
    const off   = (page - 1) * limit;
    const qLike = (q ?? '').trim();

    const order =
      sort === 'name'   ? 'name ASC'
    : sort === '-name'  ? 'name DESC'
    : sort === 'id'     ? 'id ASC'
    : sort === '-id'    ? 'id DESC'
    : 'name ASC';

    const where = qLike
      ? `WHERE (p.name ILIKE $1 OR p.sku ILIKE $1)`
      : '';

    const params: any[] = [];
    if (qLike) params.push(`%${qLike}%`);

    const totalRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS total FROM cmr."Product" p ${where}`, ...params
    );
    const total = totalRows[0]?.total ?? 0;

    const items = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
         p.id,
         COALESCE(p.name,'')         AS name,
         COALESCE(p.sku,'')          AS sku,
         COALESCE(p.uom,'')          AS uom,
         COALESCE(p.tipo,'simple')   AS tipo,
         COALESCE(p.costo_std,0)     AS "costoStd",
         COALESCE(p.precio_lista,0)  AS "precioLista",
         COALESCE(p.activo, true)    AS activo
       FROM cmr."Product" p
       ${where}
       ORDER BY ${order}
       LIMIT $${params.length+1} OFFSET $${params.length+2}`,
       ...params, limit, off
    );

    return {
      items,
      page,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  @Get()
  async listAll() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
         p.id,
         COALESCE(p.name,'')         AS name,
         COALESCE(p.sku,'')          AS sku,
         COALESCE(p.uom,'')          AS uom,
         COALESCE(p.tipo,'simple')   AS tipo,
         COALESCE(p.costo_std,0)     AS "costoStd",
         COALESCE(p.precio_lista,0)  AS "precioLista",
         COALESCE(p.activo, true)    AS activo
       FROM cmr."Product" p
       ORDER BY name ASC`
    );
    return { items: rows, total: rows.length };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const oid = Number(id);
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
         p.id,
         COALESCE(p.name,'')         AS name,
         COALESCE(p.sku,'')          AS sku,
         COALESCE(p.uom,'')          AS uom,
         COALESCE(p.tipo,'simple')   AS tipo,
         COALESCE(p.costo_std,0)     AS "costoStd",
         COALESCE(p.precio_lista,0)  AS "precioLista",
         COALESCE(p.activo, true)    AS activo
       FROM cmr."Product" p
       WHERE p.id = $1`, oid
    );
    return rows[0] ?? null;
  }

  @Post()
  async create(@Body() b: any) {
    const data = {
      name:        (b.name ?? b.nombre ?? '').trim(),
      sku:         b.sku ?? '',
      uom:         b.uom ?? '',
      tipo:        b.tipo ?? 'simple',
      costo_std:   Number(b.costoStd ?? 0),
      precio_lista:Number(b.precioLista ?? 0),
      activo:      b.activo ?? true,
    };
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO cmr."Product"(name, sku, uom, tipo, costo_std, precio_lista, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, name, sku, uom, tipo, costo_std AS "costoStd", precio_lista AS "precioLista", activo`,
      data.name, data.sku, data.uom, data.tipo, data.costo_std, data.precio_lista, data.activo
    );
    return rows[0];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() b: any) {
    const oid = Number(id);
    const data = {
      name:        (b.name ?? b.nombre ?? '').trim(),
      sku:         b.sku ?? '',
      uom:         b.uom ?? '',
      tipo:        b.tipo ?? 'simple',
      costo_std:   Number(b.costoStd ?? 0),
      precio_lista:Number(b.precioLista ?? 0),
      activo:      b.activo ?? true,
    };
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE cmr."Product"
         SET name=$1, sku=$2, uom=$3, tipo=$4, costo_std=$5, precio_lista=$6, activo=$7
       WHERE id=$8
       RETURNING id, name, sku, uom, tipo, costo_std AS "costoStd", precio_lista AS "precioLista", activo`,
      data.name, data.sku, data.uom, data.tipo, data.costo_std, data.precio_lista, data.activo, oid
    );
    return rows[0] ?? null;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const oid = Number(id);
    await this.prisma.$queryRawUnsafe(`DELETE FROM cmr."Product" WHERE id=$1`, oid);
    return { ok: true };
  }
}