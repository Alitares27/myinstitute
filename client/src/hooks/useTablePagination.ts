import { useEffect,useState } from "react";
import { TABLE_PAGE_SIZE } from "../shared/constants";

export function useTablePagination<T>(rows:T[],resetKey?:unknown){
  const [requestedPage,setPage]=useState(1);
  const totalPages=Math.max(1,Math.ceil(rows.length/TABLE_PAGE_SIZE));
  const currentPage=Math.min(requestedPage,totalPages);
  useEffect(()=>setPage(1),[resetKey]);
  useEffect(()=>{if(requestedPage>totalPages)setPage(totalPages);},[requestedPage,totalPages]);
  return {items:rows.slice((currentPage-1)*TABLE_PAGE_SIZE,currentPage*TABLE_PAGE_SIZE),currentPage,totalPages,setPage};
}
