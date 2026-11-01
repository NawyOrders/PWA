import { CheckoutSteps, type CheckoutStep } from "@/components/cart/checkout-steps";

export function CheckoutHeader({
  title,
  subtitle,
  step,
}: {
  title: string;
  subtitle: string;
  step: CheckoutStep;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4 lg:mt-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
      <div className="lg:order-1">
        <h1 className="hidden text-4xl font-extrabold leading-tight lg:block">{title}</h1>
        <p className="text-sm leading-6 text-muted lg:mt-2">{subtitle}</p>
      </div>
      <CheckoutSteps active={step} className="lg:order-2" />
    </div>
  );
}
