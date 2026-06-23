import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import HeroSlider from "@/components/HeroSlider";
import CategoriesSection from "@/components/CategoriesSection";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="container">
        <HeroSlider />

        <CategoriesSection />

        <div className="bottom-space" />
      </main>

      <BottomNav />
    </>
  );
}