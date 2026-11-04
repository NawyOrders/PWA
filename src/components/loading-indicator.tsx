import Image from "next/image";

export function LoadingIndicator({
  className = "size-12",
  label = "جارٍ التحميل",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-label={label} className={`inline-grid shrink-0 place-items-center ${className}`}>
      <Image
        src="/images/loader.svg"
        alt=""
        aria-hidden="true"
        width={55}
        height={55}
        unoptimized
        className="size-full"
      />
    </span>
  );
}
