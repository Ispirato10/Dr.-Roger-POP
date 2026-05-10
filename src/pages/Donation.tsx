import React from 'react';
import { motion } from 'motion/react';
import { Heart, Coffee, CreditCard, QrCode, Copy, Check, Info } from 'lucide-react';

export default function Donation() {
  const [copiedPayload, setCopiedPayload] = React.useState(false);
  const [amount, setAmount] = React.useState<string>('1.00');
  const [customAmount, setCustomAmount] = React.useState<string>('');
  
  const pixKey = 'numeupix@hotmail.com';

  const generatePixPayload = (key: string, amountValue: string) => {
    // Helper to format EMV tags (ID + Length + Value)
    const f = (id: string, val: string) => `${id}${val.length.toString().padStart(2, '0')}${val}`;
    
    // Merchant Account Information (Tag 26)
    const gui = f('00', 'BR.GOV.BCB.PIX');
    const keyInfo = f('01', key);
    const merchantAccountInfo = f('26', gui + keyInfo);
    
    // Payload components
    const tags = [
      f('00', '01'),                        // Payload Format Indicator
      merchantAccountInfo,                  // Merchant Account Information
      f('52', '0000'),                      // Merchant Category Code
      f('53', '986'),                       // Transaction Currency (BRL)
      f('54', parseFloat(amountValue).toFixed(2)), // Transaction Amount
      f('58', 'BR'),                        // Country Code
      f('59', 'Dr Roger Farmaceutica'),      // Merchant Name
      f('60', 'SAO PAULO'),                 // Merchant City
      f('62', f('05', '***')),              // Additional Data Field (Transaction ID)
    ].join('');

    const payloadWithCrcTag = tags + '6304';
    
    // CRC16 CCITT
    let crc = 0xFFFF;
    for (let i = 0; i < payloadWithCrcTag.length; i++) {
      crc ^= payloadWithCrcTag.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
      }
    }
    const finalCrc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return payloadWithCrcTag + finalCrc;
  };

  const pixPayload = React.useMemo(() => generatePixPayload(pixKey, amount), [amount, pixKey]);

  const copyPixPayload = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 3000);
  };

  const handleAmountSelect = (val: string) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setCustomAmount(val);
    if (val && !isNaN(parseFloat(val))) setAmount(val);
  };

  // QR Code real baseado no payload PIX
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 py-6 md:py-10">
      <div className="text-center md:text-left space-y-2">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          Apoie o Dr. Roger <span className="text-blue-600">POP</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl">
          Mantenha este ecossistema gratuito e em constante evolução para a comunidade farmacêutica.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Esquerdo: Texto e Valores */}
        <div className="lg:col-span-7 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                <Heart size={28} fill="currentColor" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Por que contribuir?</h2>
                <p className="text-sm text-slate-500">Seu apoio financeiro garante a independência do projeto.</p>
              </div>
            </div>
            
            <div className="space-y-4 text-slate-600 leading-relaxed text-sm md:text-base">
              <p>
                O <strong>Dr. Roger POP</strong> é uma ferramenta independente. Sua contribuição ajuda a manter a infraestrutura 
                de nuvem, o armazenamento seguro de documentos e o desenvolvimento de novos templates profissionais.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {[
                  'Manutenção de Servidores 24h',
                  'Novos POPs Mensais',
                  'Segurança de Dados Avançada',
                  'Suporte à Comunidade'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-700 font-medium text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 px-2 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-500" />
              Escolha ou digite um valor
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: '1.00', label: 'R$ 1', icon: Coffee },
                { val: '10.00', label: 'R$ 10', icon: Heart },
                { val: '50.00', label: 'R$ 50', icon: CreditCard },
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => handleAmountSelect(item.val)}
                  className={`p-4 md:p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    amount === item.val && !customAmount 
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' 
                    : 'border-slate-100 bg-white hover:border-blue-200 text-slate-600'
                  }`}
                >
                  <item.icon size={24} className={amount === item.val && !customAmount ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-lg font-black">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-400 font-bold">R$</span>
              </div>
              <input
                type="text"
                placeholder="Outro valor (Ex: 25.00)"
                value={customAmount}
                onChange={handleCustomAmountChange}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 bg-white"
              />
            </div>
            
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
              <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-tight">
                Após realizar o Pix, não é necessário enviar o comprovante. O sistema identifica sua intenção de apoio, mas lembre-se: este é um gesto voluntário de carinho pelo projeto.
              </p>
            </div>
          </div>
        </div>

        {/* Lado Direito: QR Code e Chave */}
        <div className="lg:col-span-5">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0f172a] text-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-slate-800 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 blur-[80px] -mr-10 -mt-10"></div>
            
            <div className="relative z-10 space-y-8">
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black flex items-center justify-center gap-3">
                  <QrCode size={28} className="text-blue-400" />
                  PIX Automático
                </h3>
                <p className="text-slate-400 text-sm">Escaneie o código com seu banco</p>
              </div>

              <div className="bg-white p-6 rounded-3xl w-56 h-56 md:w-64 md:h-64 mx-auto shadow-inner flex items-center justify-center relative group">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code Pix" 
                  className="w-full h-full rounded-lg transition-transform group-hover:scale-105 duration-500"
                />
                <div className="absolute -bottom-3 -right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  R$ {amount}
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block text-center">Código Pix "Copia e Cola"</label>
                    <div 
                      onClick={copyPixPayload}
                      className="bg-slate-800/80 hover:bg-slate-800 p-4 rounded-2xl border border-slate-700 cursor-pointer transition-all flex items-center justify-between group h-14"
                    >
                      <span className="font-mono text-xs truncate mr-4 text-blue-100">{pixPayload}</span>
                      {copiedPayload ? (
                        <span className="flex items-center gap-1 text-green-400 font-bold text-xs shrink-0">
                          <Check size={14} /> Copiado
                        </span>
                      ) : (
                        <Copy size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/50">
                  <p className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-tight">
                    Favorecido: Dr. Roger Farmacêutica Ltda.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <footer className="mt-8 text-center">
            <p className="text-slate-400 text-xs italic">
              "A união da farmácia com a tecnologia é o futuro do nosso setor."
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
