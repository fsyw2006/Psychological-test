"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, FileText, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/hero-soul-house.png"
          alt="心灵小屋柔和测评空间"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cream-50/96 via-cream-50/70 to-cream-50/12 dark:from-background/96 dark:via-background/72 dark:to-background/20" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container relative flex min-h-[76svh] items-center py-16 sm:min-h-[78svh]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <Badge variant="soft" className="mb-5">
            <Sparkles className="mr-1 size-3" />
            专业心理测评与成长分析平台
          </Badge>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight text-foreground sm:text-6xl">
            了解自己，是改变自己的开始
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-muted-foreground sm:text-lg">
            完成不同心理测试，获得清晰的基础分析与可解锁的高级成长报告。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/tests">
                开始测评
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="glass" size="lg" className="w-full sm:w-auto">
              <Link href="/account/reports">
                <FileText />
                查看报告
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/support">
                <MessageCircle />
                联系客服
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
