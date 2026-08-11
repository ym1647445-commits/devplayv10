import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AiResult={reply:string;should_escalate:boolean;category:"deposit"|"order"|"wallet"|"account"|"suggestion"|"other";subject:string;summary:string};
const schema={type:"object",additionalProperties:false,properties:{reply:{type:"string"},should_escalate:{type:"boolean"},category:{type:"string",enum:["deposit","order","wallet","account","suggestion","other"]},subject:{type:"string"},summary:{type:"string"}},required:["reply","should_escalate","category","subject","summary"]} as const;

export async function POST(request:Request){
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return Response.json({error:"يلزم تسجيل الدخول أولًا."},{status:401});
  if(!process.env.OPENAI_API_KEY)return Response.json({error:"DevPlay AI غير مفعّل بعد على الخادم."},{status:503});

  const form=await request.formData();
  const message=String(form.get("message")??"").trim();
  const history=String(form.get("history")??"").slice(0,8000);
  const image=form.get("image");
  if(message.length<1||message.length>2000)return Response.json({error:"اكتب رسالة من 1 إلى 2000 حرف."},{status:400});

  const content:Array<Record<string,unknown>>=[{type:"input_text",text:`سجل المحادثة المختصر:\n${history||"لا يوجد"}\n\nرسالة العميل الحالية:\n${message}`}];
  if(image instanceof File&&image.size>0){
    if(image.size>4*1024*1024||!['image/jpeg','image/png','image/webp'].includes(image.type))return Response.json({error:"الصورة يجب أن تكون PNG أو JPG أو WebP وأقل من 4MB."},{status:400});
    const encoded=Buffer.from(await image.arrayBuffer()).toString("base64");
    content.push({type:"input_image",image_url:`data:${image.type};base64,${encoded}`,detail:"low"});
  }

  try{
    const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:45000,maxRetries:1});
    const response=await openai.responses.create({
      model:process.env.OPENAI_SUPPORT_MODEL||"gpt-5-mini",
      instructions:`أنت DevPlay AI، مساعد دعم عربي لمتجر DevPlay Top Up. أجب بالعربية البسيطة وباختصار.
مسموح: شرح استخدام الموقع، خطوات الطلب والمحفظة والبحث والإيداع، قراءة لقطة شاشة ووصف الخطأ، واقتراح خطوات آمنة.
ممنوع: الادعاء أنك عدلت رصيدًا أو طلبًا، طلب كلمات مرور أو مفاتيح أو أكواد تحقق، كشف أكواد منتجات، أو اتخاذ قرار مالي.
صعّد فورًا إذا كانت المشكلة تخص رصيدًا مفقودًا، خصمًا، طلبًا فاشلًا/متأخرًا، كودًا غير صالح، بيانات حساب، شكوى، أو إذا لم تكن واثقًا. صعّد أيضًا إذا طلب العميل موظفًا.
عند التصعيد: reply يجب أن يخبر العميل أن محادثة دعم أُنشئت تلقائيًا، وsummary يصف المشكلة والخطوات التي جُربت والمعلومة الناقصة دون اختلاق. عند عدم التصعيد اجعل summary فارغًا.`,
      input:[{role:"user",content:content as never}],
      text:{format:{type:"json_schema",name:"devplay_support_result",strict:true,schema}},
    });
    const result=JSON.parse(response.output_text) as AiResult;
    let ticketId:string|undefined;
    if(result.should_escalate){
      const{data,error}=await supabase.rpc("create_ai_escalated_ticket",{p_category:result.category,p_subject:result.subject.slice(0,120),p_message:message,p_ai_summary:result.summary});
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      ticketId=row?.ticket_id;
    }
    return Response.json({reply:result.reply,escalated:result.should_escalate,ticketId});
  }catch(error){
    console.error("DevPlay AI support error",error);
    if(error instanceof OpenAI.APIError&&(error.status===429||error.code==="credit_balance_exhausted")){
      return Response.json({error:"DevPlay AI غير متاح مؤقتًا بسبب انتهاء رصيد خدمة الذكاء الاصطناعي. يمكنك فتح محادثة مباشرة مع خدمة العملاء."},{status:503});
    }
    if(error instanceof OpenAI.APIConnectionTimeoutError){
      return Response.json({error:"استغرق DevPlay AI وقتًا أطول من المتوقع. حاول مرة أخرى أو تواصل مباشرة مع خدمة العملاء."},{status:504});
    }
    return Response.json({error:"تعذر تشغيل المساعد الآن. يمكنك فتح محادثة مباشرة مع خدمة العملاء."},{status:500});
  }
}
