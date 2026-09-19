import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center px-4 py-24 text-center">
      <Image src="/logo.png" alt="" width={72} height={79} />
      <h1 className="font-carter-one mt-4 text-3xl">This film isn&apos;t in the catalogue</h1>
      <p className="mt-2 max-w-md text-white/70">It may have moved or never been here. Search for it by title, or describe the story and let PopChoice find it.</p>
      <Link href="/" className="mt-6 rounded-md bg-pop px-5 py-2.5 font-bold text-night hover:brightness-110">Back to PopStream</Link>
    </div>
  );
}
