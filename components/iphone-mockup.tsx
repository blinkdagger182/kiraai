"use client"

import Image from "next/image"

export function IPhoneMockup() {
  return (
    <div className="w-full h-[700px] md:h-[820px] relative select-none flex items-center justify-center">
      {/* Subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 50%, oklch(0.40 0.06 140 / 0.08) 0%, transparent 70%)",
        }}
      />
      
      {/* 3D perspective container */}
      <div 
        className="relative"
        style={{ 
          perspective: "1200px",
          perspectiveOrigin: "50% 50%"
        }}
      >
        {/* Phone stack container */}
        <div className="relative w-[600px] h-[700px] md:w-[700px] md:h-[780px]">
          
          {/* Back phone - AI Chat (bottom right) */}
          <div
            className="absolute animate-float-slow"
            style={{
              right: "0",
              bottom: "0",
              transform: "rotateY(-8deg) rotateX(2deg) translateZ(-30px)",
              transformStyle: "preserve-3d",
              animation: "floatSlow 6s ease-in-out infinite",
            }}
          >
            <div className="relative">
              {/* Phone frame */}
              <div 
                className="relative bg-[#1c1c1e] rounded-[52px] p-[12px] shadow-2xl"
                style={{
                  boxShadow: "0 50px 100px -20px rgba(0,0,0,0.25), 0 30px 60px -30px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.1)",
                }}
              >
                {/* Dynamic Island */}
                <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-full z-20" />
                
                {/* Screen */}
                <div className="relative w-[260px] h-[562px] md:w-[280px] md:h-[606px] rounded-[40px] overflow-hidden bg-black">
                  <Image
                    src="/images/kira-ai-chat.png"
                    alt="Kira AI Chat"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
              
              {/* Side button accents */}
              <div className="absolute right-[-2px] top-[120px] w-[3px] h-[32px] bg-[#2c2c2e] rounded-r-sm" />
              <div className="absolute left-[-2px] top-[100px] w-[3px] h-[28px] bg-[#2c2c2e] rounded-l-sm" />
              <div className="absolute left-[-2px] top-[150px] w-[3px] h-[56px] bg-[#2c2c2e] rounded-l-sm" />
            </div>
          </div>
          
          {/* Front phone - Dashboard (top left) */}
          <div
            className="absolute z-10 animate-float"
            style={{
              left: "0",
              top: "0",
              transform: "rotateY(8deg) rotateX(2deg) translateZ(30px)",
              transformStyle: "preserve-3d",
              animation: "float 5s ease-in-out infinite",
            }}
          >
            <div className="relative">
              {/* Phone frame */}
              <div 
                className="relative bg-[#1c1c1e] rounded-[52px] p-[12px] shadow-2xl"
                style={{
                  boxShadow: "0 50px 100px -20px rgba(0,0,0,0.3), 0 30px 60px -30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)",
                }}
              >
                {/* Dynamic Island */}
                <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-full z-20" />
                
                {/* Screen */}
                <div className="relative w-[260px] h-[562px] md:w-[280px] md:h-[606px] rounded-[40px] overflow-hidden bg-black">
                  <Image
                    src="/images/kira-app.png"
                    alt="Kira Dashboard"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
              
              {/* Side button accents */}
              <div className="absolute right-[-2px] top-[120px] w-[3px] h-[32px] bg-[#2c2c2e] rounded-r-sm" />
              <div className="absolute left-[-2px] top-[100px] w-[3px] h-[28px] bg-[#2c2c2e] rounded-l-sm" />
              <div className="absolute left-[-2px] top-[150px] w-[3px] h-[56px] bg-[#2c2c2e] rounded-l-sm" />
            </div>
          </div>
          
        </div>
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: rotateY(8deg) rotateX(2deg) translateZ(30px) translateY(0px);
          }
          50% {
            transform: rotateY(8deg) rotateX(2deg) translateZ(30px) translateY(-12px);
          }
        }
        @keyframes floatSlow {
          0%, 100% {
            transform: rotateY(-8deg) rotateX(2deg) translateZ(-30px) translateY(0px);
          }
          50% {
            transform: rotateY(-8deg) rotateX(2deg) translateZ(-30px) translateY(-8px);
          }
        }
      `}</style>
    </div>
  )
}
