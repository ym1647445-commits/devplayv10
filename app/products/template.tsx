import { Suspense } from "react";
import { ProductCatalogSections } from "./ProductCatalogSections";
export default function ProductsTemplate({children}:{children:React.ReactNode}){return <><Suspense fallback={null}><ProductCatalogSections/></Suspense>{children}</>}

