import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormStep {
  id: string;
  label: string;
  description?: string;
  icon?: React.ElementType;
}

interface FormStepIndicatorProps {
  steps: FormStep[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function FormStepIndicator({ 
  steps, 
  currentStep, 
  onStepClick,
  className 
}: FormStepIndicatorProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Desktop View - Horizontal */}
      <div className="hidden md:flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        
        {/* Progress line filled */}
        <motion.div 
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary to-primary/80"
          initial={{ width: "0%" }}
          animate={{ 
            width: `${Math.min(100, (currentStep / (steps.length - 1)) * 100)}%` 
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;
          
          return (
            <motion.button
              key={step.id}
              onClick={() => onStepClick?.(index)}
              disabled={isPending}
              className={cn(
                "relative z-10 flex flex-col items-center gap-2 group",
                isPending ? "cursor-not-allowed" : "cursor-pointer"
              )}
              whileHover={!isPending ? { scale: 1.05 } : undefined}
              whileTap={!isPending ? { scale: 0.95 } : undefined}
            >
              {/* Step circle */}
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                "shadow-sm",
                isCompleted && "bg-primary border-primary text-primary-foreground shadow-primary/25 shadow-lg",
                isCurrent && "bg-background border-primary text-primary ring-4 ring-primary/20 shadow-primary/30 shadow-lg",
                isPending && "bg-muted border-border text-muted-foreground"
              )}>
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Check className="h-5 w-5" />
                  </motion.div>
                ) : StepIcon ? (
                  <StepIcon className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              
              {/* Step label */}
              <div className="text-center">
                <p className={cn(
                  "text-xs font-medium transition-colors",
                  isCompleted && "text-primary",
                  isCurrent && "text-foreground",
                  isPending && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[80px] line-clamp-1">
                    {step.description}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Mobile View - Vertical/Compact */}
      <div className="md:hidden flex items-center gap-3 px-2">
        <div className="flex items-center gap-1.5">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentStep ? "w-6 bg-primary" : "w-2",
                index < currentStep && "bg-primary/60",
                index > currentStep && "bg-border"
              )}
              layoutId="mobile-step-indicator"
            />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{steps[currentStep]?.label}</p>
          <p className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>
    </div>
  );
}
