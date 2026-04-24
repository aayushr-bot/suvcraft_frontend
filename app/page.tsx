import AllProducts from "./components/AllProducts";
import BagCollection from "./components/BagCollection";
import Hero from "./components/Hero";
import TopSelling from "./components/TopSelling";

export default function Home() {
  return (
    <>
      <Hero />
      <TopSelling />
      <BagCollection />
      <AllProducts />
    </>
  );
}
