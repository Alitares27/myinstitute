import { Request } from "express";
import { pool } from "../models/db";
import { positiveId } from "./validation";
export function pageOptions(req: Request, sorts: Record<string,string>, fallback: string) {
  const page=positiveId(req.query.page || 1),limit=Math.min(positiveId(req.query.limit || 20),100);
  const key=String(req.query.sort || "");
  const order=Object.prototype.hasOwnProperty.call(sorts,key)?sorts[key]:fallback;
  const direction=req.query.direction === "asc"?"ASC":"DESC";
  return {page,limit,order,direction};
}
export async function readPage(req: Request, select: string, params: any[], sorts: Record<string,string>, fallback: string, summary="'{}'::jsonb") {
  const {page,limit,order,direction}=pageOptions(req,sorts,fallback);
  const query=`WITH filtered AS NOT MATERIALIZED (${select}) SELECT
    (SELECT COALESCE(json_agg(item),'[]'::json) FROM (SELECT * FROM filtered ORDER BY ${order} ${direction},id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}) item) AS items,
    COUNT(*)::int AS total, ${summary} AS summary FROM filtered`;
  const result=await pool.query(query,[...params,limit,(page-1)*limit]);
  return {...result.rows[0],page,limit};
}
export function addFilters(req: Request, params: any[], columns: Record<string,string>) {
  const where:string[]=[];
  for(const [key,column] of Object.entries(columns)) if(req.query[key]) {params.push(positiveId(req.query[key]));where.push(`${column}=$${params.length}`);}
  return where;
}
export function addSearch(req: Request, params: any[], columns: string[]) {
  if(!req.query.search) return [];
  params.push(`%${String(req.query.search).slice(0,100)}%`);
  return [`(${columns.map(column=>`${column} ILIKE $${params.length}`).join(" OR ")})`];
}
