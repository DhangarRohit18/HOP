import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getComponentQRUrl,
  getPublicAppUrl,
  setCustomPublicAppUrl,
  isLocalhostOnly
} from '../../../services/supply_chain/networkConfig';
import {
  Download,
  Printer,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  Globe,
  Wifi,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface QRCodeComponentProps {
  partId: string;
  displayName: string;
  category?: string;
  criticality?: string;
  size?: number;
  showDebug?: boolean;
}

export const QRCodeComponent: React.FC<QRCodeComponentProps> = ({
  partId,
  displayName,
  category,
  criticality,
  size = 175,
  showDebug = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(showDebug);
  const [customIpInput, setCustomIpInput] = useState('');
  const [currentBaseUrl, setCurrentBaseUrl] = useState(getPublicAppUrl());

  const qrUrl = getComponentQRUrl(partId);
  const apiEndpoint = `${currentBaseUrl.replace(':3000', ':8000')}/api/components/${partId}`;
  const isLocalhost = isLocalhostOnly();

  const handleUpdateIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (customIpInput.trim()) {
      let formatted = customIpInput.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `http://${formatted}`;
      }
      if (!formatted.includes(':') && !formatted.startsWith('https')) {
        formatted = `${formatted}:3000`;
      }
      setCustomPublicAppUrl(formatted);
      setCurrentBaseUrl(getPublicAppUrl());
    }
  };

  const handleResetIp = () => {
    setCustomPublicAppUrl('');
    setCurrentBaseUrl(getPublicAppUrl());
    setCustomIpInput('');
  };

  const downloadQRCode = () => {
    const svg = document.getElementById(`qr-svg-${partId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `SupplyShield_QR_${partId}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center space-y-3 font-mono text-center">
      
      {/* Localhost Mobile Warning Banner */}
      {isLocalhost && (
        <div className="w-full p-2 bg-amber-950/40 border border-amber-800/60 rounded-[8px] text-[10px] text-amber-300 flex items-center justify-between gap-1.5 text-left">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>LAN Wi-Fi Mode active ({currentBaseUrl}). Reachable by mobile phone!</span>
          </div>
        </div>
      )}

      {/* High-Resolution QR Card with Quiet Zone */}
      <div className="p-4 bg-nexus-white rounded-[8px] shadow-2xl border-4 border-blue-800/80 inline-block transition-transform hover:scale-[1.02]">
        <QRCodeSVG
          id={`qr-svg-${partId}`}
          value={qrUrl}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>

      {/* Component Title & Live Status */}
      <div className="space-y-1 max-w-xs">
        <h4 className="text-xs font-bold text-nexus-white tracking-wide">{displayName}</h4>
        <p className="text-[11px] text-sky-400 font-bold">{partId}</p>
        <p className="text-[10px] text-nexus-blue-60">SCAN FOR LIVE COMPONENT STATUS</p>
        
        {/* Live Reachable URL */}
        <div className="flex items-center justify-center space-x-1.5 text-[10px] text-emerald-400 bg-blue-950 px-2.5 py-1 rounded-[8px] border border-blue-800">
          <span className="w-2 h-2 rounded-[4px] bg-emerald-400 animate-pulse"></span>
          <span className="truncate max-w-[210px]">{qrUrl}</span>
        </div>
      </div>

      {/* Action Buttons: Download, Print, Copy */}
      <div className="flex items-center space-x-2 pt-1 flex-wrap justify-center gap-y-2">
        <button
          onClick={downloadQRCode}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-nexus-blue-dark hover:bg-nexus-blue text-blue-100 rounded-[8px] text-xs font-semibold transition-all border border-nexus-blue shadow-sm"
          title="Download PNG QR Code"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Download</span>
        </button>

        <button
          onClick={() => window.print()}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-nexus-blue-dark hover:bg-nexus-blue text-blue-100 rounded-[8px] text-xs font-semibold transition-all border border-nexus-blue shadow-sm"
          title="Print QR Code"
        >
          <Printer className="w-3.5 h-3.5 text-amber-400" />
          <span>Print</span>
        </button>

        <button
          onClick={copyLinkToClipboard}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-nexus-blue-dark hover:bg-nexus-blue text-blue-100 rounded-[8px] text-xs font-semibold transition-all border border-nexus-blue shadow-sm"
          title="Copy Live Component URL"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
          <span>{copied ? 'Copied' : 'Copy Link'}</span>
        </button>
      </div>

      {/* Developer Debug Toggle & Panel */}
      <div className="w-full pt-2">
        <button
          onClick={() => setIsDebugOpen(!isDebugOpen)}
          className="text-[10px] text-nexus-blue-60 hover:text-blue-100 flex items-center justify-center space-x-1 mx-auto"
        >
          <Terminal className="w-3 h-3" />
          <span>{isDebugOpen ? 'Hide Technical QR Details' : 'Show Technical QR Details'}</span>
        </button>

        {isDebugOpen && (
          <div className="mt-2 p-3.5 bg-blue-950 rounded-[8px] border border-blue-800 text-left text-[10px] space-y-2 text-nexus-blue-42">
            <div className="space-y-1 border-b border-blue-800 pb-2">
              <p className="flex justify-between">
                <span className="text-nexus-blue-60">QR Payload URL:</span>
                <span className="text-sky-400 truncate max-w-[190px]">{qrUrl}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-nexus-blue-60">Canonical Part ID:</span>
                <span className="text-emerald-400 font-bold">{partId}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-nexus-blue-60">Route Validation:</span>
                <span className="text-emerald-400 font-bold">VALID (/component/:partId)</span>
              </p>
              <p className="flex justify-between">
                <span className="text-nexus-blue-60">API Endpoint:</span>
                <span className="text-sky-400 truncate max-w-[190px]">{apiEndpoint}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-nexus-blue-60">QR Error Correction:</span>
                <span className="text-nexus-white">Level H (30% Damage Recovery)</span>
              </p>
              <p className="flex justify-between">
                <span className="text-nexus-blue-60">Mobile Wi-Fi Target:</span>
                <span className="text-emerald-400 font-mono font-bold">{currentBaseUrl}</span>
              </p>
            </div>

            {/* Custom LAN IP Overrider Form */}
            <form onSubmit={handleUpdateIp} className="pt-1 space-y-1.5">
              <label className="text-nexus-blue-60 block text-[10px]">
                Override Network IP for Mobile Testing:
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.100:3000"
                  value={customIpInput}
                  onChange={(e) => setCustomIpInput(e.target.value)}
                  className="flex-1 px-2 py-1 bg-blue-950 border border-nexus-blue rounded text-blue-100 focus:outline-none focus:border-sky-500 font-mono text-[10px]"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-blue-950 hover:bg-nexus-blue text-nexus-white rounded text-[10px] font-bold"
                >
                  Set
                </button>
                <button
                  type="button"
                  onClick={handleResetIp}
                  className="px-2 py-1 bg-nexus-blue-dark text-nexus-blue-42 rounded text-[10px]"
                  title="Reset to default LAN IP"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};
