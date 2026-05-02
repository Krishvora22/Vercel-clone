import React from "react";
import Link from "next/link";

function Footer() {
  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 bg-black text-white">
      <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
        <Link href="https://portfolio.priyanshuvaliya.me"
            target="_blank">
        <p className="text-gray-400">Priyanshu Valiya © 2024 </p></Link>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <Link
            href="https://github.com/PriyanshuValiya"
            target="_blank"
            className="text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </Link>
          <Link
            href="https://www.linkedin.com/in/priyanshu-valiya19012006"
            target="_blank"
            className="text-gray-400 hover:text-white transition-colors"
          >
            LinkedIn
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Footer;
