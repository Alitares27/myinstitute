export default function Pagination({currentPage,totalPages,onChange,label="Paginación"}:{currentPage:number;totalPages:number;onChange:(page:number)=>void;label?:string}){
  if(totalPages<=1)return null;
  const pages=[...new Set([1,totalPages,currentPage-1,currentPage,currentPage+1].filter(page=>page>=1&&page<=totalPages))].sort((a,b)=>a-b);
  return <nav className="app-pagination" aria-label={label}>
    <span>Página {currentPage} de {totalPages}</span>
    <div className="app-pagination-buttons">
      <button type="button" className="btn secondary" disabled={currentPage<=1} onClick={()=>onChange(currentPage-1)}>Anterior</button>
      {pages.map((page,index)=><span className="pagination-slot" key={page}>{index>0&&page-pages[index-1]>1&&<span className="pagination-gap" aria-hidden="true">…</span>}<button type="button" className={`btn ${page===currentPage?"primary":"secondary"}`} aria-label={`Página ${page}`} aria-current={page===currentPage?"page":undefined} onClick={()=>onChange(page)}>{page}</button></span>)}
      <button type="button" className="btn secondary" disabled={currentPage>=totalPages} onClick={()=>onChange(currentPage+1)}>Siguiente</button>
    </div>
  </nav>;
}
