import Link from "next/link";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";

/** Native cell links keep row drill-downs accessible without hydrating table rows. */
export function DrillRow({ href, children, className="" }: { href: string; children: ReactNode; className?:string }) {
  return <tr className={"drill-row "+className}>{Children.map(children, cell => {
    if (!isValidElement<{children: ReactNode}>(cell)) return cell;
    const content = cell.props.children;
    if (isValidElement(content) && content.type === Link) return cell;
    return cloneElement(cell, {children: <Link className="row-cell-link" href={href}>{content}</Link>});
  })}</tr>;
}
