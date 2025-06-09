import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function Home() {
  return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex justify-center items-center">
          <h1 className="text-4xl font-bold">If I'm Gone - Secure Info</h1>
        </main>
        <Footer />
      </div>
  );
}