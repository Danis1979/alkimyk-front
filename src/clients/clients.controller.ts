import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function toInt(v: any, def: number) {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function parseSort(sort?: string) {
  // soportado: nombre | -nombre | id | -id | cuit | -cuit
  const s = (sort || '').trim();
  let field = 'id';
  let dir: 'ASC' | 'DESC' = 'DESC';
  if (s) {
    const neg = s.startsWith('-');
    const raw = neg ? s.slice(1) : s;
    if (['id', 'nombre', 'cuit'].includes(raw)) field = raw;
    dir = neg ? 'DESC' : 'ASC';
  }
  return { field, dir };
}

@Controller('clients')
export class ClientsController {
  private ensured = false;

  constructor(private readonly prisma: PrismaService) {}

  private async ensureTables() {
    if (this.ensured) return;
    this.ensured = true;
    // Crea tabla mínima si no existe (demo/MVP)
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.clients (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL DEFAULT '',
        cuit TEXT NOT NULL DEFAULT '',
        direccion TEXT NOT NULL DEFAULT '',
        "condicionesPago" TEXT NOT NULL DEFAULT '',
        "listasPrecio" JSONB,
        email TEXT NOT NULL DEFAULT '',
        telefono TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  @Get('search')
  async search(
    @Query('page') pageQ?: string,
    @Query('limit') limitQ?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
  ) {
    await this.ensureTables();
    const page = toInt(pageQ, 1);
    const limit = [10, 20, 50].includes(toInt(limitQ, 20)) ? toInt(limitQ, 20) : 20;
    const { field, dir } = parseSort(sort || '-id');

    const where = (q && q.trim())
      ? `WHERE (nombre ILIKE '%'||$1||'%' OR cuit ILIKE '%'||$1||'%')`
      : '';

    const args: any[] = [];
    if (where) args.push(q!.trim());

    const totalRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS n FROM public.clients ${where}`, ...args,
    );
    const total = totalRows?.[0]?.n ?? 0;

    const offset = (page - 1) * limit;
    const items = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT id, nombre, cuit, direccion, "condicionesPago", "listasPrecio", email, telefono
      FROM public.clients
      ${where}
      ORDER BY ${field} ${dir}
      LIMIT $${args.length + 1} OFFSET $${args.length + 2}
      `,
      ...args, limit, offset
    );

    return {
      items: items.map(x => ({
        id: x.id,
        nombre: x.nombre ?? '',
        cuit: x.cuit ?? '',
        direccion: x.direccion ?? '',
        condicionesPago: x.condicionesPago ?? '',
        listasPrecio: x.listasPrecio ?? [],
        email: x.email ?? '',
        telefono: x.telefono ?? '',
      })),
      page,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  // Compatibilidad: listado plano
  @Get()
  async list() {
    await this.ensureTables();
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, nombre, cuit, direccion, "condicionesPago", "listasPrecio", email, telefono
       FROM public.clients ORDER BY id DESC LIMIT 1000`
    );
    return rows.map(x => ({
      id: x.id,
      nombre: x.nombre ?? '',
      cuit: x.cuit ?? '',
      direccion: x.direccion ?? '',
      condicionesPago: x.condicionesPago ?? '',
      listasPrecio: x.listasPrecio ?? [],
      email: x.email ?? '',
      telefono: x.telefono ?? '',
    }));
  }

  @Post()
  async create(@Body() body: any) {
    await this.ensureTables();
    const data = {
      nombre: (body?.nombre ?? '').trim(),
      cuit: body?.cuit ?? '',
      direccion: body?.direccion ?? '',
      condicionesPago: body?.condicionesPago ?? '',
      listasPrecio: Array.isArray(body?.listasPrecio) ? body.listasPrecio : [],
      email: body?.email ?? '',
      telefono: body?.telefono ?? '',
    };
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.clients (nombre, cuit, direccion, "condicionesPago", "listasPrecio", email, telefono)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
       RETURNING id, nombre, cuit, direccion, "condicionesPago", "listasPrecio", email, telefono`,
      data.nombre, data.cuit, data.direccion, data.condicionesPago, JSON.stringify(data.listasPrecio), data.email, data.telefono
    );
    return rows[0];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    await this.ensureTables();
    const oid = Number(id);
    const data = {
      nombre: (body?.nombre ?? '').trim(),
      cuit: body?.cuit ?? '',
      direccion: body?.direccion ?? '',
      condicionesPago: body?.condicionesPago ?? '',
      listasPrecio: Array.isArray(body?.listasPrecio) ? body.listasPrecio : [],
      email: body?.email ?? '',
      telefono: body?.telefono ?? '',
    };
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE public.clients
       SET nombre=$2, cuit=$3, direccion=$4, "condicionesPago"=$5, "listasPrecio"=$6::jsonb, email=$7, telefono=$8
       WHERE id=$1
       RETURNING id, nombre, cuit, direccion, "condicionesPago", "listasPrecio", email, telefono`,
      oid, data.nombre, data.cuit, data.direccion, data.condicionesPago, JSON.stringify(data.listasPrecio), data.email, data.telefono
    );
    return rows[0] ?? { id: oid };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.ensureTables();
    const oid = Number(id);
    await this.prisma.$executeRawUnsafe(`DELETE FROM public.clients WHERE id = $1`, oid);
    return { ok: true, id: oid };
  }
}