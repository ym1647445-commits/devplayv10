"use server";

import { createClient } from "@/lib/supabase/server";
import type { CouponValidationResult } from "@/types/coupon";
import { getEffectiveOfferPriceUsd, isOfferPriceSafe } from "@/lib/offerPricing";

interface CartItemPayload { productId: string; offerId: string; quantity: number }
interface CouponPayload { code: string; items: CartItemPayload[] }
interface CouponRow {
  id:string; code:string; title:string; type:"fixed"|"percentage"; value:number|string;
  currency:"USD"|"EGP"; minimum_cart_amount:number|string; maximum_discount:number|string|null;
  usage_limit:number|null; usage_count:number; per_user_limit:number; minimum_items_count:number;
  first_order_only:boolean; audience_type:"all_users"|"specific_users"|"new_users"|"selected_levels";
  application_scope:"cart"|"products"|"categories"; selected_levels:string[];
  starts_at:string; expires_at:string|null; active:boolean;
}
interface ProductRow { id:string; category_id:string|null; active:boolean; status:string; minimum_quantity:number; maximum_quantity:number }
interface OfferRow { id:string; product_id:string; supplier_price_usd:number|string; profit_usd:number|string; manual_selling_price_usd:number|string|null; stock:number|null; available:boolean; active:boolean }

const money = (value:number) => Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000;
const fail = (message:string):CouponValidationResult => ({success:false,message,coupon:null});

export async function validateCartCoupon(payload:CouponPayload):Promise<CouponValidationResult> {
  try {
    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    if (!user) return fail("يجب تسجيل الدخول لاستخدام الكوبون.");

    const code = payload.code?.trim().toUpperCase();
    if (!code) return fail("اكتبي كود الكوبون.");
    if (!Array.isArray(payload.items) || payload.items.length === 0) return fail("أضيفي منتجات إلى السلة أولًا.");
    if (payload.items.length > 50) return fail("عدد عناصر السلة أكبر من المسموح.");

    const [couponResult, profileResult, settingsResult] = await Promise.all([
      supabase.from("checkout_coupons").select("id,code,title,type,value,currency,minimum_cart_amount,maximum_discount,usage_limit,usage_count,per_user_limit,minimum_items_count,first_order_only,audience_type,application_scope,selected_levels,starts_at,expires_at,active").ilike("code", code).maybeSingle<CouponRow>(),
      supabase.from("profiles").select("customer_level,successful_orders_count,created_at").eq("id",user.id).single<{customer_level:string;successful_orders_count:number;created_at:string}>(),
      supabase.from("platform_settings").select("usd_to_egp_rate,minimum_profit_egp").eq("id",1).single<{usd_to_egp_rate:number|string;minimum_profit_egp:number|string}>(),
    ]);
    const coupon = couponResult.data;
    const profile = profileResult.data;
    const settings = settingsResult.data;
    if (!coupon) return fail("الكوبون غير موجود أو غير متاح.");
    if (!profile || !settings) return fail("تعذر قراءة بيانات الحساب أو التسعير.");

    const now = Date.now();
    if (!coupon.active) return fail("الكوبون موقوف حاليًا.");
    if (new Date(coupon.starts_at).getTime() > now) return fail("الكوبون لم يبدأ بعد.");
    if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now) return fail("انتهت صلاحية الكوبون.");
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) return fail("وصل الكوبون للحد الأقصى للاستخدام.");

    const {count:userUsage,error:usageError} = await supabase.from("checkout_coupon_usage").select("*",{count:"exact",head:true}).eq("coupon_id",coupon.id).eq("user_id",user.id);
    if (usageError) throw usageError;
    if ((userUsage ?? 0) >= coupon.per_user_limit) return fail("استخدمتِ الكوبون بالعدد المسموح.");

    const totalQuantity = payload.items.reduce((sum,item)=>sum+(Number.isInteger(item.quantity)&&item.quantity>0?item.quantity:0),0);
    if (totalQuantity < coupon.minimum_items_count) return fail(`الكوبون يحتاج إلى ${coupon.minimum_items_count} وحدة على الأقل.`);
    if (coupon.first_order_only && profile.successful_orders_count > 0) return fail("الكوبون متاح لأول طلب فقط.");

    if (coupon.audience_type === "specific_users") {
      const {data} = await supabase.from("checkout_coupon_users").select("id").eq("coupon_id",coupon.id).eq("user_id",user.id).maybeSingle();
      if (!data) return fail("الكوبون غير مخصص لهذا الحساب.");
    } else if (coupon.audience_type === "new_users") {
      if (new Date(profile.created_at).getTime() < now - 30*24*60*60*1000) return fail("الكوبون مخصص للعملاء الجدد.");
    } else if (coupon.audience_type === "selected_levels") {
      if (!(coupon.selected_levels ?? []).includes(profile.customer_level)) return fail("الكوبون غير متاح لمستوى حسابك الحالي.");
    } else if (coupon.audience_type !== "all_users") return fail("إعداد جمهور الكوبون غير صحيح.");

    const productIds = [...new Set(payload.items.map(item=>item.productId))];
    const offerIds = [...new Set(payload.items.map(item=>item.offerId))];
    if (productIds.some(id=>!id) || offerIds.some(id=>!id)) return fail("بيانات إحدى الباقات غير مكتملة. احذفيها من السلة وأضيفيها مجددًا.");
    const [productsResult,offersResult] = await Promise.all([
      supabase.from("store_products").select("id,category_id,active,status,minimum_quantity,maximum_quantity").in("id",productIds).returns<ProductRow[]>(),
      supabase.from("store_product_offers").select("id,product_id,supplier_price_usd,profit_usd,manual_selling_price_usd,stock,available,active").in("id",offerIds).returns<OfferRow[]>(),
    ]);
    if (productsResult.error || offersResult.error) return fail("تعذر التحقق من باقات السلة.");
    const products = new Map((productsResult.data??[]).map(row=>[row.id,row]));
    const offers = new Map((offersResult.data??[]).map(row=>[row.id,row]));

    let allowedProducts = new Set<string>(); let allowedCategories = new Set<string>();
    if (coupon.application_scope === "products") {
      const {data,error}=await supabase.from("checkout_coupon_products").select("product_id").eq("coupon_id",coupon.id); if(error) throw error;
      allowedProducts=new Set((data??[]).map(row=>row.product_id));
    } else if (coupon.application_scope === "categories") {
      const {data,error}=await supabase.from("checkout_coupon_categories").select("category_id").eq("coupon_id",coupon.id); if(error) throw error;
      allowedCategories=new Set((data??[]).map(row=>row.category_id));
    } else if (coupon.application_scope !== "cart") return fail("نطاق تطبيق الكوبون غير صحيح.");

    let subtotal=0,costTotal=0,eligibleSubtotal=0;
    for (const item of payload.items) {
      const product=products.get(item.productId), offer=offers.get(item.offerId), quantity=Math.floor(Number(item.quantity));
      if (!product || !offer || offer.product_id!==product.id || !product.active || product.status==="unavailable" || !offer.active || !offer.available) return fail("إحدى الباقات غير متاحة حاليًا.");
      if (!Number.isFinite(quantity) || quantity<product.minimum_quantity || quantity>product.maximum_quantity || (offer.stock!==null && offer.stock<quantity)) return fail("كمية إحدى الباقات غير صحيحة أو غير متوفرة.");
      const cost=Number(offer.supplier_price_usd), price=getEffectiveOfferPriceUsd(offer);
      if (!isOfferPriceSafe(offer)||price<=0) return fail("سعر إحدى الباقات غير صالح أو أقل من تكلفة المورد.");
      const itemTotal=price*quantity; subtotal+=itemTotal; costTotal+=cost*quantity;
      const eligible=coupon.application_scope==="cart"||allowedProducts.has(product.id)||(Boolean(product.category_id)&&allowedCategories.has(product.category_id!));
      if(eligible) eligibleSubtotal+=itemTotal;
    }
    subtotal=money(subtotal); costTotal=money(costTotal); eligibleSubtotal=money(eligibleSubtotal);
    if(eligibleSubtotal<=0) return fail("الكوبون لا ينطبق على باقات السلة الحالية.");
    const rate=Number(settings.usd_to_egp_rate), minimumProfit=Number(settings.minimum_profit_egp);
    if(!Number.isFinite(rate)||rate<=0) return fail("سعر التحويل غير صالح.");
    const minimumCartUsd=coupon.currency==="EGP"?Number(coupon.minimum_cart_amount)/rate:Number(coupon.minimum_cart_amount);
    if(subtotal<minimumCartUsd) return fail(`ناقص ${(minimumCartUsd-subtotal).toFixed(2)}$ للوصول إلى الحد الأدنى للكوبون.`);
    let discount=coupon.type==="percentage"?eligibleSubtotal*(Number(coupon.value)/100):(coupon.currency==="EGP"?Number(coupon.value)/rate:Number(coupon.value));
    if(coupon.maximum_discount!==null){const max=coupon.currency==="EGP"?Number(coupon.maximum_discount)/rate:Number(coupon.maximum_discount);discount=Math.min(discount,max)}
    discount=money(Math.min(discount,eligibleSubtotal));
    if((subtotal-costTotal-discount)*rate<minimumProfit) return fail("لا يمكن تطبيق الكوبون لأن الخصم يتجاوز حد الربح الآمن.");
    return {success:true,message:`تم تطبيق كوبون ${coupon.code} بنجاح.`,coupon:{id:coupon.id,code:coupon.code,title:coupon.title,discount}};
  } catch(error) {
    console.error("Validate cart coupon error:",error);
    return fail("تعذر التحقق من الكوبون الآن. حاولي مرة أخرى.");
  }
}
