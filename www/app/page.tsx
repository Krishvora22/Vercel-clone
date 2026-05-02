"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Globe, Shield, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Footer";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Deploy in seconds with our optimized build pipeline",
  },
  {
    icon: Globe,
    title: "Global CDN",
    description: "Serve your apps from the edge, worldwide",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Built-in security features and SSL certificates",
  },
  {
    icon: Rocket,
    title: "Serverless Functions",
    description: "Scale automatically with zero configuration",
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  const handleClick = () => {
    if (user) router.push("/dashboard");
    else router.push("/login");
  };

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold text-3xl">Vercel</span>
              </Link>

              <div className="hidden md:flex items-center space-x-6">
                <Link
                  href="/templates"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Templates
                </Link>
                <Link
                  href="/docs"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Docs
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Pricing
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                className="bg-black text-white hover:bg-gray-800"
                onClick={handleClick}
              >
                Start Deploying
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold text-gray-900 mb-6">
              Develop,{" "}
              <span className="text-4xl md:text-6xl lg:text-7xl font-semibold text-gray-900 mb-6">
                Build &
              </span>{" "}
              Ship
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Vercel is the platform for frontend teams. Give your team the
              toolkit to build and deploy web applications that perform at
              scale.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button
                size="lg"
                className="bg-black text-white hover:bg-gray-800 px-8 py-3"
                onClick={handleClick}
              >
                <p className="text-base">Start Deploying</p>
              </Button>
            </div>
          </motion.div>

          {/* Animated Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 40 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="bg-white rounded-xl shadow-2xl border overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div className="ml-4 text-sm text-gray-500">
                  vercel.priyanshuvaliya.me/project
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Projects</h3>
                  <Button size="sm">New Project</Button>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                          <span className="text-white text-xs">P</span>
                        </div>
                        <div>
                          <div className="font-medium">project-{i}</div>
                          <div className="text-sm text-gray-500">
                            Deployed 2 hours ago
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Deployed
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to ship fast
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From development to deployment, we&apos;ve got you covered with
              the best tools and infrastructure.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group"
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="flex justify-between items-center gap-x-5">
                    <feature.icon className="h-14 w-14 mb-4 group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
