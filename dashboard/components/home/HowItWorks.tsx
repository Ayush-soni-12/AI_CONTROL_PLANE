"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Package, Radar, BrainCircuit, Settings2 } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const steps = [
  {
    icon: Package,
    step: "01",
    title: "Integrate the SDK",
    description:
      "Install our lightweight Node.js SDK into your service. Just a few lines of code to connect to the control plane.",
    color: "from-blue-500 to-cyan-500",
    iconColor: "text-blue-400",
  },
  {
    icon: Radar,
    step: "02",
    title: "Auto-Discovery",
    description:
      "Your services and endpoints are automatically discovered. The control plane maps your entire architecture in real-time.",
    color: "from-purple-500 to-pink-500",
    iconColor: "text-purple-400",
  },
  {
    icon: BrainCircuit,
    step: "03",
    title: "AI Analyzes Metrics",
    description:
      "Gemini AI continuously analyzes latency, error rates, and traffic patterns. It tunes thresholds and detects anomalies automatically.",
    color: "from-emerald-500 to-teal-500",
    iconColor: "text-emerald-400",
  },
  {
    icon: Settings2,
    step: "04",
    title: "Intelligent Control Applied",
    description:
      "Caching, circuit breaking, rate limiting, and load shedding decisions are applied automatically based on AI analysis.",
    color: "from-amber-500 to-orange-500",
    iconColor: "text-amber-400",
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  useGSAP(
    () => {
      // Heading
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );

      // Timeline line draw
      if (lineRef.current) {
        const lineLength = lineRef.current.getTotalLength();
        gsap.set(lineRef.current, {
          strokeDasharray: lineLength,
          strokeDashoffset: lineLength,
        });

        gsap.to(lineRef.current, {
          strokeDashoffset: 0,
          duration: 2,
          ease: "none",
          scrollTrigger: {
            trigger: ".timeline-container",
            start: "top 75%",
            end: "bottom 50%",
            scrub: 1,
          },
        });
      }

      // Step cards
      const stepCards = sectionRef.current?.querySelectorAll(".step-card");
      stepCards?.forEach((card, index) => {
        gsap.fromTo(
          card,
          { opacity: 0, x: index % 2 === 0 ? -50 : 50, y: 20 },
          {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              once: true,
            },
          },
        );

        // Step dot pulse
        const dot = card.querySelector(".step-dot");
        if (dot) {
          gsap.fromTo(
            dot,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.6,
              ease: "back.out(2)",
              scrollTrigger: {
                trigger: card,
                start: "top 80%",
                once: true,
              },
            },
          );
        }
      });
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className="mb-28">
      {/* Section heading */}
      <div
        ref={headingRef}
        className="text-center mb-16"
        style={{ opacity: 0 }}
      >
        <span className="inline-block text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full mb-4 border border-emerald-500/20">
          HOW IT WORKS
        </span>
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          From Integration to{" "}
          <span className="bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Intelligent Control
          </span>
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Four simple steps to transform your microservices infrastructure
        </p>
      </div>

      {/* Timeline */}
      <div className="timeline-container relative max-w-3xl mx-auto">
        {/* Vertical line (SVG for scroll animation) */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 md:-translate-x-px w-px hidden sm:block">
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 1 100"
            style={{ height: "100%" }}
          >
            <line
              ref={lineRef}
              x1="0.5"
              y1="0"
              x2="0.5"
              y2="100"
              stroke="url(#lineGradient)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="rgb(168, 85, 247)"
                  stopOpacity="0.8"
                />
                <stop
                  offset="50%"
                  stopColor="rgb(236, 72, 153)"
                  stopOpacity="0.8"
                />
                <stop
                  offset="100%"
                  stopColor="rgb(52, 211, 153)"
                  stopOpacity="0.8"
                />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Steps */}
        <div className="space-y-12 sm:space-y-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;

            return (
              <div
                key={step.step}
                className={`step-card relative flex items-start gap-6 sm:gap-8 ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                }`}
                style={{ opacity: 0 }}
              >
                {/* Dot on timeline */}
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 hidden sm:flex">
                  <div
                    className="step-dot relative flex items-center justify-center"
                    style={{ opacity: 0 }}
                  >
                    <span
                      className={`absolute w-8 h-8 rounded-full bg-linear-to-br ${step.color} opacity-20 animate-ping`}
                    />
                    <span
                      className={`relative w-4 h-4 rounded-full bg-linear-to-br ${step.color}`}
                    />
                  </div>
                </div>

                {/* Card */}
                <div
                  className={`flex-1 sm:pl-16 md:pl-0 ${
                    isEven ? "md:pr-12 md:text-right" : "md:pl-12"
                  } ${isEven ? "md:ml-0" : "md:mr-0"}`}
                >
                  <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-300">
                    <div
                      className={`flex items-center gap-3 mb-3 ${
                        isEven ? "md:flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className={`inline-flex p-2.5 rounded-xl bg-linear-to-br ${step.color}/10 border border-gray-800`}
                      >
                        <Icon className={`w-5 h-5 ${step.iconColor}`} />
                      </div>
                      <span
                        className={`text-sm font-bold bg-linear-to-r ${step.color} bg-clip-text text-transparent`}
                      >
                        STEP {step.step}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Spacer for the other side */}
                <div className="hidden md:block flex-1" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
