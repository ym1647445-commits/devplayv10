"use server";
import type { RewardRedemptionResult } from "@/types/reward";
export async function redeemReward(_rewardId:string):Promise<RewardRedemptionResult>{return{success:false,message:"نظام النقاط والمكافآت متوقف حاليًا. الكوبونات الرسمية فقط هي المتاحة."}}