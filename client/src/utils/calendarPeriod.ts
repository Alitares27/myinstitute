const months=["ene.","feb.","mar.","abr.","may.","jun.","jul.","ago.","sep.","oct.","nov.","dic."];
export function shortWeekRange(start:Date,end:Date){
  const sameMonth=start.getMonth()===end.getMonth()&&start.getFullYear()===end.getFullYear();
  return sameMonth?`${start.getDate()} a ${end.getDate()} ${months[end.getMonth()]}`:`${start.getDate()} ${months[start.getMonth()]} a ${end.getDate()} ${months[end.getMonth()]}`;
}
