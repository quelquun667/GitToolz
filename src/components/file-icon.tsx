
'use client';

import { File, FileCode2, FileJson, FileText, FileImage, FileType } from 'lucide-react';

const TypescriptIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <path d="M12 12v-2h4"></path>
    <path d="M12 10h-1.5a1.5 1.5 0 0 0 0 3H12"></path>
    <path d="M12 15h2.5a1.5 1.5 0 0 0 0-3H12"></path>
  </svg>
);

const JavascriptIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <path d="M8 10h2a2 2 0 0 1-2 2v0a2 2 0 0 1 2-2h0"></path>
    <path d="M14 10h2a2 2 0 0 1-2 2v0a2 2 0 0 1 2-2h0"></path>
  </svg>
);

const PythonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M13.83 11.92c-.39-.23-.64-.6-.64-1.04a2.42 2.42 0 0 1 2.42-2.42h.05c2.42 0 2.42 2.42 2.42 2.42v.1a2.53 2.53 0 0 1-2.52 2.52.5.5 0 0 0-.49.5v5.8a1 1 0 0 1-1 1h-4.3a1 1 0 0 1-1-1v-4.3a1 1 0 0 1 1-1h5.71a.5.5 0 0 0 .49-.5Z" />
    <path d="M10.17 12.08c.39.23.64.6.64 1.04a2.42 2.42 0 0 0-2.42 2.42h-.05c-2.42 0-2.42-2.42-2.42-2.42v-.1a2.53 2.53 0 0 0 2.52-2.52.5.5 0 0 1 .49-.5v-5.8a1 1 0 0 0-1-1h4.3a1 1 0 0 0 1 1v4.3a1 1 0 0 0-1 1h-5.71a.5.5 0 0 1-.49.5Z" />
  </svg>
);

const NextJsIcon = () => (
  <svg
    aria-label="Next.js logomark"
    role="img"
    viewBox="0 0 180 180"
    className="h-4 w-4"
    fill="currentColor"
  >
    <mask
      id="a"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="180"
      height="180"
    >
      <circle cx="90" cy="90" r="90" fill="#fff"></circle>
    </mask>
    <g mask="url(#a)">
      <circle cx="90" cy="90" r="90"></circle>
      <path
        d="M149.509 157.52L69.14 37.135H55.081v105.39h14.058V59.453l66.422 101.303h13.948z"
        fill="url(#b)"
        transform="translate(-2.5 -2.5)"
        filter="url(#c)"
      ></path>
      <path
        d="M121.13 37.135h14.058v105.39h-14.058z"
        fill="url(#d)"
        transform="translate(-2.5 -2.5)"
        filter="url(#e)"
      ></path>
    </g>
    <defs>
      <linearGradient
        id="b"
        x1="107.325"
        y1="37.135"
        x2="107.325"
        y2="162.52"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#fff"></stop>
        <stop offset="1" stopColor="#fff" stopOpacity="0"></stop>
      </linearGradient>
      <linearGradient
        id="d"
        x1="128.159"
        y1="37.135"
        x2="128.159"
        y2="142.525"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#fff"></stop>
        <stop offset="1" stopColor="#fff" stopOpacity="0"></stop>
      </linearGradient>
      <filter
        id="c"
        x="55.081"
        y="37.135"
        width="94.428"
        height="120.385"
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feBlend
          in="SourceGraphic"
          in2="BackgroundImageFix"
          result="shape"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        ></feColorMatrix>
        <feOffset dy="-2.5"></feOffset>
        <feGaussianBlur stdDeviation="1.25"></feGaussianBlur>
        <feComposite
          in2="hardAlpha"
          operator="arithmetic"
          k2="-1"
          k3="1"
        ></feComposite>
        <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"></feColorMatrix>
        <feBlend in2="shape" result="effect1_innerShadow_1020_11964"></feBlend>
      </filter>
      <filter
        id="e"
        x="121.13"
        y="37.135"
        width="14.058"
        height="105.39"
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
        <feBlend
          in="SourceGraphic"
          in2="BackgroundImageFix"
          result="shape"
        ></feBlend>
        <feColorMatrix
          in="SourceAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        ></feColorMatrix>
        <feOffset dy="-2.5"></feOffset>
        <feGaussianBlur stdDeviation="1.25"></feGaussianBlur>
        <feComposite
          in2="hardAlpha"
          operator="arithmetic"
          k2="-1"
          k3="1"
        ></feComposite>
        <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"></feColorMatrix>
        <feBlend in2="shape" result="effect1_innerShadow_1020_11964"></feBlend>
      </filter>
    </defs>
  </svg>
);


type FileIconProps = {
  filename: string;
  className?: string;
};

export default function FileIcon({ filename, className }: FileIconProps) {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  const getIcon = () => {
    switch (extension) {
      case 'ts':
      case 'tsx':
        if (filename.includes('.config.ts')) return <NextJsIcon />;
        return <TypescriptIcon />;
      case 'js':
      case 'jsx':
      case 'mjs':
        return <JavascriptIcon />;
      case 'py':
        return <PythonIcon />;
      case 'json':
        if (filename.includes('package.json')) return <FileType className="h-4 w-4 text-orange-400"/>;
        return <FileJson className="h-4 w-4 text-yellow-400" />;
      case 'md':
        return <FileText className="h-4 w-4 text-blue-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return <FileImage className="h-4 w-4 text-purple-400" />;
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return <FileCode2 className="h-4 w-4 text-pink-400" />;
      case 'html':
        return <FileCode2 className="h-4 w-4 text-red-400" />;
      case 'yml':
      case 'yaml':
         return <FileCode2 className="h-4 w-4 text-teal-400" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return <div className={className}>{getIcon()}</div>;
}
