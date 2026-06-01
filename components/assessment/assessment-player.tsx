"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Assessment, AssessmentAnswerInput } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AssessmentPlayer({ test }: { test: Assessment }) {
  const router = useRouter();
  const storageKey = `soul-house-answers-${test.slug}`;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const question = test.questions[index];
  const progress = ((index + 1) / test.questions.length) * 100;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);

  const currentValues = answers[question.id] || [];
  const answeredCount = useMemo(
    () => test.questions.filter((item) => (answers[item.id] || []).length > 0).length,
    [answers, test.questions]
  );

  function toggleValue(value: string) {
    setError("");
    setAnswers((current) => {
      const previous = current[question.id] || [];
      if (question.type === "multiple") {
        const exists = previous.includes(value);
        const next = exists ? previous.filter((item) => item !== value) : [...previous, value];
        if (question.max && next.length > question.max) return current;
        return { ...current, [question.id]: next };
      }
      return { ...current, [question.id]: [value] };
    });
  }

  function goNext() {
    if (question.required && currentValues.length === 0) {
      setError("请选择一个答案后继续。");
      return;
    }
    setIndex((value) => Math.min(test.questions.length - 1, value + 1));
  }

  async function submit() {
    const missing = test.questions.find((item) => item.required && !(answers[item.id] || []).length);
    if (missing) {
      setIndex(test.questions.indexOf(missing));
      setError("这道题还没有完成。");
      return;
    }

    setSubmitting(true);
    setError("");
    const payload: AssessmentAnswerInput[] = test.questions.map((item) => ({
      questionId: item.id,
      values: answers[item.id] || []
    }));

    const response = await fetch("/api/results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        testSlug: test.slug,
        answers: payload
      })
    });
    const data = await response.json();

    if (!response.ok) {
      setSubmitting(false);
      setError(data.error || "提交失败，请稍后再试。");
      return;
    }

    localStorage.removeItem(storageKey);
    localStorage.setItem(
      `soul-house-result-${data.result.id}`,
      JSON.stringify(data.result)
    );
    router.push(`/reports/${data.result.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            第 {index + 1} 题 / 共 {test.questions.length} 题
          </span>
          <span className="flex items-center gap-1">
            <Save className="size-3.5" />
            已自动保存 {answeredCount} 题
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="glass-panel rounded-lg p-4 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-6"
          >
            <div>
              <p className="eyebrow">{test.category}</p>
              <h1 className="mt-2 text-xl font-semibold leading-snug sm:text-3xl">
                {question.title}
              </h1>
              {question.helper ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{question.helper}</p>
              ) : null}
            </div>

            <div className="grid gap-3">
              {question.options.map((option) => {
                const selected = currentValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleValue(option.value)}
                    className={cn(
                      "focus-ring flex min-h-14 items-center justify-between gap-3 rounded-md border bg-background/[0.68] p-4 text-left text-sm transition-all hover:border-primary/60 hover:bg-background",
                      selected && "border-primary bg-primary/10 text-primary"
                    )}
                  >
                    <span className="leading-6">{option.label}</span>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        selected && "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      {selected ? <CheckCircle2 className="size-4" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0 || submitting}
            className="w-full"
          >
            <ArrowLeft />
            上一题
          </Button>
          {index === test.questions.length - 1 ? (
            <Button onClick={submit} disabled={submitting} className="w-full">
              <CheckCircle2 />
              {submitting ? "提交中" : "提交测评"}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={submitting} className="w-full">
              下一题
              <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
