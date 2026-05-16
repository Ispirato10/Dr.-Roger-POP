import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Pill, 
  User, 
  FileText, 
  Save, 
  FileDown, 
  Clock,
  Printer,
  Plus,
  Trash2,
  Stethoscope,
  ShieldCheck,
  Loader2,
  Search,
  BookOpen,
  Edit,
  MapPin,
  UserCheck,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';

const prescriptionSchema = z.object({
  patientName: z.string().min(3, 'Nome do paciente é obrigatório'),
  patientAddress: z.string().optional(),
  pharmacistName: z.string().min(3, 'Nome do farmacêutico é obrigatório'),
  pharmacistCrf: z.string().min(1, 'CRF é obrigatório'),
  items: z.array(z.object({
    medication: z.string().min(1, 'Medicamento é obrigatório'),
    quantity: z.string().min(1, 'Quantidade é obrigatória'),
    instructions: z.string().min(1, 'Instruções são obrigatórias'),
  })).min(1, 'Adicione pelo menos um item'),
  orientations: z.string().optional(),
  validUntil: z.string().optional(),
});

type PrescriptionForm = z.infer<typeof prescriptionSchema>;

interface PrescriptionTemplate {
  id: string;
  name: string;
  items: { medication: string; quantity: string; instructions: string }[];
  orientations?: string;
}

interface Medication {
  id: string;
  name: string;
  defaultPosology: string;
  defaultQuantity: string;
}

const DEFAULT_MEDICATIONS: Medication[] = [
  // Analgésicos e Antitérmicos
  { id: '1', name: 'Dipirona Monoidratada 500mg', defaultPosology: 'Tomar 1 comprimido de 6/6h se dor ou febre.', defaultQuantity: '10 comprimidos' },
  { id: '2', name: 'Paracetamol 750mg', defaultPosology: 'Tomar 1 comprimido de 6/6h se dor ou febre.', defaultQuantity: '10 comprimidos' },
  { id: '3', name: 'Ibuprofeno 400mg', defaultPosology: 'Tomar 1 comprimido de 8/8h após as refeições.', defaultQuantity: '10 comprimidos' },
  { id: '4', name: 'Ácido Acetilsalicílico 100mg (Infantil)', defaultPosology: 'Tomar 1 comprimido ao dia se necessário.', defaultQuantity: '20 comprimidos' },
  { id: '5', name: 'Dipirona Gotas 500mg/ml', defaultPosology: 'Tomar 1 gota por kg de peso de 6/6h.', defaultQuantity: '1 frasco' },
  { id: '6', name: 'Paracetamol Gotas 200mg/ml', defaultPosology: 'Tomar 1 gota por kg de peso de 6/6h.', defaultQuantity: '1 frasco' },
  
  // Antigripais e Descongestionantes
  { id: '7', name: 'Cimegripe / Resfenol', defaultPosology: 'Tomar 1 cápsula de 8/8h.', defaultQuantity: '20 cápsulas' },
  { id: '8', name: 'Sorine / Neosoro', defaultPosology: 'Pingar 2 gotas em cada narina de 8/8h.', defaultQuantity: '1 frasco' },
  { id: '9', name: 'Vick Pyrena', defaultPosology: 'Dissolver 1 sachê em água quente 3x ao dia.', defaultQuantity: '5 envelopes' },
  { id: '10', name: 'Multigrip', defaultPosology: 'Tomar 1 comprimido a cada 4 ou 6 horas.', defaultQuantity: '20 comprimidos' },

  // Gastrointestinais
  { id: '11', name: 'Omeprazol 20mg', defaultPosology: 'Tomar 1 cápsula em jejum.', defaultQuantity: '28 cápsulas' },
  { id: '12', name: 'Sal de Fruta Eno', defaultPosology: 'Dissolver 1 colher/sachê em água se azia.', defaultQuantity: '1 frasco/sachê' },
  { id: '13', name: 'Simeticona 40mg', defaultPosology: 'Tomar 1 comprimido 3x ao dia se gases.', defaultQuantity: '20 comprimidos' },
  { id: '14', name: 'Hidróxido de Alumínio Suspensão', defaultPosology: 'Tomar 1 colher de sopa após as refeições.', defaultQuantity: '1 frasco' },
  { id: '15', name: 'Buscopan Composto', defaultPosology: 'Tomar 1 comprimido de 8/8h para cólicas.', defaultQuantity: '20 comprimidos' },
  { id: '16', name: 'Simeticona Gotas 75mg/ml', defaultPosology: 'Tomar 10 a 20 gotas até 3x ao dia.', defaultQuantity: '1 frasco' },
  { id: '17', name: 'Domperidona 10mg', defaultPosology: 'Tomar 1 comprimido 15 min antes das refeições.', defaultQuantity: '30 comprimidos' },
  { id: '18', name: 'Enterogermina', defaultPosology: 'Tomar 1 frasco ao dia.', defaultQuantity: '5 frascos' },
  { id: '19', name: 'Floratil 200mg', defaultPosology: 'Tomar 1 cápsula 2x ao dia.', defaultQuantity: '6 cápsulas' },
  { id: '20', name: 'Luftal', defaultPosology: 'Tomar 1 comprimido até 3x ao dia.', defaultQuantity: '20 comprimidos' },

  // Antialérgicos
  { id: '21', name: 'Loratadina 10mg', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '10 comprimidos' },
  { id: '22', name: 'Desloratadina 5mg', defaultPosology: 'Tomar 1 comprimido à noite.', defaultQuantity: '10 comprimidos' },
  { id: '23', name: 'Allegra 120mg', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '10 comprimidos' },
  { id: '24', name: 'Polaramine 2mg', defaultPosology: 'Tomar 1 comprimido de 8/8h.', defaultQuantity: '20 comprimidos' },
  { id: '25', name: 'Histamin', defaultPosology: 'Tomar 1 comprimido de 12/12h.', defaultQuantity: '20 comprimidos' },

  // Vitaminas e Minerais
  { id: '26', name: 'Vitamina C 1g Efervescente', defaultPosology: 'Dissolver 1 comprimido em água ao dia.', defaultQuantity: '10 comprimidos' },
  { id: '27', name: 'Centrum / Multivitamínico', defaultPosology: 'Tomar 1 comprimido após o café da manhã.', defaultQuantity: '30 comprimidos' },
  { id: '28', name: 'Vitamina D3 2.000 UI', defaultPosology: 'Tomar 1 cápsula ao dia.', defaultQuantity: '30 cápsulas' },
  { id: '29', name: 'Complexo B', defaultPosology: 'Tomar 1 drágea ao dia.', defaultQuantity: '20 drágeas' },
  { id: '30', name: 'Sulfato Ferroso 40mg (Ferro)', defaultPosology: 'Tomar 1 comprimido antes do almoço.', defaultQuantity: '30 comprimidos' },
  { id: '31', name: 'Magnésio Bisglicinato', defaultPosology: 'Tomar 1 cápsula 2x ao dia.', defaultQuantity: '60 cápsulas' },
  { id: '32', name: 'Cloreto de Magnésio PA', defaultPosology: 'Dissolver em 1L e tomar 50ml ao dia.', defaultQuantity: '1 sachê' },
  { id: '33', name: 'Ômega 3 1000mg', defaultPosology: 'Tomar 1 cápsula 2x ao dia com as refeições.', defaultQuantity: '60 cápsulas' },
  { id: '34', name: 'Zinco 20mg', defaultPosology: 'Tomar 1 cápsula ao dia.', defaultQuantity: '30 cápsulas' },
  { id: '35', name: 'Addera D3 Gotas', defaultPosology: 'Pingar conforme recomendação ao dia.', defaultQuantity: '1 frasco' },

  // Relaxantes Musculares e Tópicos
  { id: '36', name: 'Dorflex / Miosan', defaultPosology: 'Tomar 1 comprimido de 8/8h se dor muscular.', defaultQuantity: '12 comprimidos' },
  { id: '37', name: 'Tandrilax / Torsilax', defaultPosology: 'Tomar 1 comprimido de 12/12h.', defaultQuantity: '15 comprimidos' },
  { id: '38', name: 'Diclofenaco Gel (Cataflam Emulgel)', defaultPosology: 'Aplicar no local da dor 3x ao dia.', defaultQuantity: '1 bisnaga' },
  { id: '39', name: 'Salompas Adesivo', defaultPosology: 'Aplicar no local afetado por até 8 horas.', defaultQuantity: '1 envelope' },
  { id: '40', name: 'Gelol Mastigável', defaultPosology: 'Mastigar 1 comprimido se necessário.', defaultQuantity: '10 comprimidos' },

  // Outros MIPs e Higiene
  { id: '41', name: 'Nebacetin Pomada', defaultPosology: 'Aplicar no ferimento 2 a 3x ao dia.', defaultQuantity: '1 bisnaga' },
  { id: '42', name: 'Bepantol Derma', defaultPosology: 'Aplicar na área ressecada sempre que necessário.', defaultQuantity: '1 bisnaga' },
  { id: '43', name: 'Hipoglós', defaultPosology: 'Aplicar após cada troca de fralda.', defaultQuantity: '1 bisnaga' },
  { id: '44', name: 'Dramin B6', defaultPosology: 'Tomar 1 comprimido 30 min antes de viajar.', defaultQuantity: '10 comprimidos' },
  { id: '45', name: 'Eno Abacaxi', defaultPosology: 'Uso conforme necessidade para azia.', defaultQuantity: '1 frasco' },
  { id: '46', name: 'Gaviscon', defaultPosology: 'Tomar 1 sachê após refeições.', defaultQuantity: '12 sachês' },
  { id: '47', name: 'Puran T4 (Apenas se já indicado)', defaultPosology: 'Tomar conforme prescrição anterior em jejum.', defaultQuantity: '30 comprimidos' },
  { id: '48', name: 'Aspirina Prevent', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '30 comprimidos' },
  { id: '49', name: 'Calmante Natural (Passiflora)', defaultPosology: 'Tomar 1 comprimido 2x ao dia.', defaultQuantity: '20 comprimidos' },
  { id: '50', name: 'Seis-B (Piridoxina)', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '20 comprimidos' },
  
  // Lista Estendida (+50 itens simulados para atingir volume)
  { id: '51', name: 'Mylanta Plus', defaultPosology: 'Tomar 5ml após as refeições.', defaultQuantity: '1 frasco' },
  { id: '52', name: 'Buscopan Simples', defaultPosology: 'Tomar 1 comprimido 3x ao dia.', defaultQuantity: '20 comprimidos' },
  { id: '53', name: 'Cofal', defaultPosology: 'Tomar 1 comprimido 8/8h.', defaultQuantity: '20 comprimidos' },
  { id: '54', name: 'Decongex Plus', defaultPosology: 'Tomar 1 comprimido de 12/12h.', defaultQuantity: '12 comprimidos' },
  { id: '55', name: 'Apracur', defaultPosology: 'Tomar 1 comprimido de 8/8h.', defaultQuantity: '20 comprimidos' },
  { id: '56', name: 'Coristina D', defaultPosology: 'Tomar 1 comprimido de 6/6h.', defaultQuantity: '16 comprimidos' },
  { id: '57', name: 'Claritin 10mg', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '12 comprimidos' },
  { id: '58', name: 'Zyrtec', defaultPosology: 'Tomar 1 comprimido à noite.', defaultQuantity: '10 comprimidos' },
  { id: '59', name: 'Abrilar Xarope', defaultPosology: 'Tomar 5ml de 8/8h se tosse.', defaultQuantity: '1 frasco' },
  { id: '60', name: 'Notuss Xarope', defaultPosology: 'Tomar 7.5ml de 8/8h.', defaultQuantity: '1 frasco' },
  { id: '61', name: 'Fluimucil 600mg', defaultPosology: 'Dissolver 1 sachê em água ao dia.', defaultQuantity: '16 sachês' },
  { id: '62', name: 'Asetisin 500mg', defaultPosology: 'Tomar 1 comprimido de 8/8h.', defaultQuantity: '20 comprimidos' },
  { id: '63', name: 'Anador', defaultPosology: 'Tomar 1 comprimido se dor.', defaultQuantity: '10 comprimidos' },
  { id: '64', name: 'Novalgina 1g', defaultPosology: 'Tomar 1 comprimido de 8/8h.', defaultQuantity: '10 comprimidos' },
  { id: '65', name: 'Tylenol 750mg', defaultPosology: 'Tomar 1 comprimido de 6/6h.', defaultQuantity: '10 comprimidos' },
  { id: '66', name: 'Melhoral', defaultPosology: 'Tomar 1 comprimido se dor de cabeça.', defaultQuantity: '10 comprimidos' },
  { id: '67', name: 'Gingo Biloba 120mg', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '30 comprimidos' },
  { id: '68', name: 'Castanha da Índia', defaultPosology: 'Tomar 1 comprimido 2x ao dia.', defaultQuantity: '30 cápsulas' },
  { id: '69', name: 'Catuaba Selvagem (Cápsulas)', defaultPosology: 'Uso conforme indicado na bula.', defaultQuantity: '60 cápsulas' },
  { id: '70', name: 'Imecap Hair', defaultPosology: 'Tomar 1 cápsula ao dia.', defaultQuantity: '30 cápsulas' },
  { id: '71', name: 'Pantogar', defaultPosology: 'Tomar 1 cápsula 3x ao dia.', defaultQuantity: '90 cápsulas' },
  { id: '72', name: 'Lavitan Mulher', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '60 comprimidos' },
  { id: '73', name: 'Lavitan Homem', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '60 comprimidos' },
  { id: '74', name: 'A-Z Polivitamínico', defaultPosology: 'Tomar 1 cápsula ao dia.', defaultQuantity: '30 cápsulas' },
  { id: '75', name: 'Calcium + Vit D', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '60 comprimidos' },
  { id: '76', name: 'Osteoban', defaultPosology: 'Tomar conforme recomendação.', defaultQuantity: '30 comprimidos' },
  { id: '77', name: 'Gerovital', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '30 drágeas' },
  { id: '78', name: 'Fosfosol', defaultPosology: 'Tomar 1 cápsula 3x ao dia.', defaultQuantity: '30 cápsulas' },
  { id: '79', name: 'Memoriol', defaultPosology: 'Tomar 1 cápsula ao dia.', defaultQuantity: '20 cápsulas' },
  { id: '80', name: 'Sertralina (Tarjado - Apenas Ref)', defaultPosology: 'Conforme indicado pelo médico.', defaultQuantity: '30 comprimidos' },
  { id: '81', name: 'Rivotril (Tarjado - Apenas Ref)', defaultPosology: 'Uso restrito sob prescrição médica.', defaultQuantity: '30 comprimidos' },
  { id: '82', name: 'Valeriana', defaultPosology: 'Tomar 1 cápsula antes de deitar.', defaultQuantity: '20 cápsulas' },
  { id: '83', name: 'Melatonina 0,21mg', defaultPosology: 'Tomar 1 gota/comprimido antes de deitar.', defaultQuantity: '1 frasco/30 comp' },
  { id: '84', name: 'Triptofano', defaultPosology: 'Tomar 1 cápsula à noite.', defaultQuantity: '60 cápsulas' },
  { id: '85', name: 'Colágeno Hidrolisado', defaultPosology: 'Dissolver 1 dose em água ao dia.', defaultQuantity: '1 lata' },
  { id: '86', name: 'Bio-C', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '10 comprimidos' },
  { id: '87', name: 'Targifor C', defaultPosology: 'Dissolver 1 comprimido em água ao dia.', defaultQuantity: '16 comprimidos' },
  { id: '88', name: 'Supradyn', defaultPosology: 'Dissolver 1 comprimido ao dia.', defaultQuantity: '15 comprimidos' },
  { id: '89', name: 'Redoxon', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '10 comprimidos' },
  { id: '90', name: 'Cebion', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '10 comprimidos' },
  { id: '91', name: 'Laxante Bisacodil (Dulcolax)', defaultPosology: 'Tomar 1 comprimido ao deitar.', defaultQuantity: '20 comprimidos' },
  { id: '92', name: 'Lactopurga', defaultPosology: 'Tomar 1 comprimido ao deitar.', defaultQuantity: '16 comprimidos' },
  { id: '93', name: 'Óleo de Rícino', defaultPosology: 'Uso conforme necessidade.', defaultQuantity: '1 frasco' },
  { id: '94', name: 'Minilax', defaultPosology: 'Uso retal conforme necessidade.', defaultQuantity: '7 bisnagas' },
  { id: '95', name: 'Suppositório Glicerina', defaultPosology: 'Uso conforme necessidade.', defaultQuantity: '6 unidades' },
  { id: '96', name: 'Funchicórea', defaultPosology: 'Uso pediátrico conforme bula.', defaultQuantity: '1 frasco' },
  { id: '97', name: 'Broncho-Vaxom', defaultPosology: 'Tomar 1 cápsula ao dia por 10 dias.', defaultQuantity: '10 cápsulas' },
  { id: '98', name: 'Kaloba', defaultPosology: 'Tomar 30 gotas 3x ao dia.', defaultQuantity: '1 frasco' },
  { id: '99', name: 'Propolis Extrato', defaultPosology: 'Pingar 20 gotas em água 2x ao dia.', defaultQuantity: '1 frasco' },
  { id: '100', name: 'Mel e Própolis', defaultPosology: 'Usar spray 3x ao dia se dor de garganta.', defaultQuantity: '1 frasco' },
  { id: '101', name: 'Strepsils', defaultPosology: 'Dissolver 1 pastilha na boca a cada 3h.', defaultQuantity: '16 pastilhas' },
  { id: '102', name: 'Ciflogex', defaultPosology: 'Usar spray ou pastilha.', defaultQuantity: '1 frasco/pastilhas' },
  { id: '103', name: 'Flogoral', defaultPosology: 'Usar spray 3x ao dia.', defaultQuantity: '1 frasco' },
  { id: '104', name: 'Nistatina Suspensão', defaultPosology: 'Bochechar e deglutir 5ml 4x ao dia.', defaultQuantity: '1 frasco' },
  { id: '105', name: 'Gingilone', defaultPosology: 'Aplicar na afta 3x ao dia.', defaultQuantity: '1 bisnaga' },
  { id: '106', name: 'Malvatricin', defaultPosology: 'Bochechar 15ml sem diluir 3-4x ao dia.', defaultQuantity: '1 frasco' },
  { id: '107', name: 'Periogard / Cepacol', defaultPosology: 'Bochechar após a higiene bucal.', defaultQuantity: '1 frasco' },
  { id: '108', name: 'Sorinan Gotas', defaultPosology: '2 gotas em cada narina 3x ao dia.', defaultQuantity: '1 frasco' },
  { id: '109', name: 'Rinosoro 3%', defaultPosology: 'Descongestionamento nasal conforme necessidade.', defaultQuantity: '1 frasco' },
  { id: '110', name: 'Naridrin', defaultPosology: 'Uso nasal conforme necessidade.', defaultQuantity: '1 frasco' },
  { id: '111', name: 'Vick Vaporub', defaultPosology: 'Aplicar no peito e pescoço ao deitar.', defaultQuantity: '1 pote' },
  { id: '112', name: 'Vick Inalador', defaultPosology: 'Inalar em cada narina conforme necessidade.', defaultQuantity: '1 unidade' },
  { id: '113', name: 'Transpulmin Pomada', defaultPosology: 'Aplicar no peito e costas 2-3x ao dia.', defaultQuantity: '1 bisnaga' },
  { id: '114', name: 'Bisolvon Xarope', defaultPosology: 'Tomar 10ml de 8/8h.', defaultQuantity: '1 frasco' },
  { id: '115', name: 'Mucosolvan', defaultPosology: 'Tomar 7.5ml de 8/8h.', defaultQuantity: '1 frasco' },
  { id: '116', name: 'Vitamina A+D Gotas', defaultPosology: 'Tomar conforme recomendação pediátrica.', defaultQuantity: '1 frasco' },
  { id: '117', name: 'Bio-Vitus', defaultPosology: 'Tomar 1 colher de sobremesa ao dia.', defaultQuantity: '1 frasco' },
  { id: '118', name: 'Emulsão Scott', defaultPosology: 'Tomar 1 colher de sopa ao dia após refeição.', defaultQuantity: '1 frasco' },
  { id: '119', name: 'Kalyamon B12', defaultPosology: 'Tomar 10ml ao dia.', defaultQuantity: '1 frasco' },
  { id: '120', name: 'Combiron', defaultPosology: 'Tomar 1 comprimido ao dia após almoço.', defaultQuantity: '30 comprimidos' },
  { id: '121', name: 'Neutrofer', defaultPosology: 'Tomar conforme orientação ao dia.', defaultQuantity: '30 comprimidos' },
  { id: '122', name: 'Noripurum', defaultPosology: 'Tomar conforme recomendação médica.', defaultQuantity: '30 comprimidos' },
  { id: '123', name: 'Encontros (Vitamina)', defaultPosology: 'Tomar 1 cápsula ao dia.', defaultQuantity: '30 cápsulas' },
  { id: '124', name: 'Pharmaton', defaultPosology: 'Tomar 1 cápsula após o café da manhã.', defaultQuantity: '30 cápsulas' },
  { id: '125', name: 'Vitasay 50+', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '30 comprimidos' },
  { id: '126', name: 'Tebonin 80mg', defaultPosology: 'Tomar 1 comprimido 2x ao dia.', defaultQuantity: '30 comprimidos' },
  { id: '127', name: 'Tanakan', defaultPosology: 'Tomar 1 comprimido de 8/8h.', defaultQuantity: '30 comprimidos' },
  { id: '128', name: 'Equilid (Apenas Referência)', defaultPosology: 'Uso restrito sob prescrição.', defaultQuantity: '30 cápsulas' },
  { id: '129', name: 'Fitoterápico Ansiodoron', defaultPosology: 'Tomar 1 comprimido 3x ao dia.', defaultQuantity: '60 comprimidos' },
  { id: '130', name: 'Passiflorine', defaultPosology: 'Tomar 10ml antes de deitar.', defaultQuantity: '1 frasco' },
  { id: '131', name: 'Maracugina', defaultPosology: 'Tomar 1 comprimido 3x ao dia.', defaultQuantity: '20 comprimidos' },
  { id: '132', name: 'Valeriane / Remotiv', defaultPosology: 'Tomar conforme indicação de bula.', defaultQuantity: '30 comprimidos' },
  { id: '133', name: 'Estomazil Sabor Lima', defaultPosology: 'Uso conforme necessidade para azia.', defaultQuantity: '1 frasco' },
  { id: '134', name: 'Pepsamar', defaultPosology: 'Mastigar 1-2 comprimidos após refeições.', defaultQuantity: '10 comprimidos' },
  { id: '135', name: 'Kolantyl', defaultPosology: 'Tomar 10ml entre as refeições.', defaultQuantity: '1 frasco' },
  { id: '136', name: 'Digeplus', defaultPosology: 'Tomar 1 cápsula antes das refeições.', defaultQuantity: '30 cápsulas' },
  { id: '137', name: 'Digestil', defaultPosology: 'Tomar 1 comprimido 3x ao dia.', defaultQuantity: '20 comprimidos' },
  { id: '138', name: 'Epocler', defaultPosology: 'Tomar 1 flaconete até 3x ao dia.', defaultQuantity: '12 flaconetes' },
  { id: '139', name: 'Engov', defaultPosology: 'Tomar 1 comprimido antes e 1 depois do consumo.', defaultQuantity: '6 comprimidos' },
  { id: '140', name: 'Xantinon', defaultPosology: 'Tomar 1 drágea 3x ao dia.', defaultQuantity: '30 drágeas' },
  { id: '141', name: 'Chop (Silimarina)', defaultPosology: 'Tomar 1 cápsula 2x ao dia.', defaultQuantity: '30 cápsulas' },
  { id: '142', name: 'Legalon', defaultPosology: 'Tomar conforme recomendação de bula.', defaultQuantity: '30 cápsulas' },
  { id: '143', name: 'Simiobio / Probiótico', defaultPosology: 'Tomar 1 sachê ao dia.', defaultQuantity: '10 sachês' },
  { id: '144', name: 'Replex (Laxante)', defaultPosology: 'Tomar conforme bula.', defaultQuantity: '20 comprimidos' },
  { id: '145', name: 'Naturetti', defaultPosology: 'Tomar 1 cápsula ao deitar.', defaultQuantity: '16 cápsulas' },
  { id: '146', name: 'Almeida Prado 46', defaultPosology: 'Tomar 2 comprimidos ao deitar.', defaultQuantity: '40 comprimidos' },
  { id: '147', name: 'Tamarine', defaultPosology: 'Tomar 1 cápsula ou colher ao deitar.', defaultQuantity: '20 cápsulas/geleia' },
  { id: '148', name: 'Vênula', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '30 comprimidos' },
  { id: '149', name: 'Antistax', defaultPosology: 'Tomar 1 comprimido pela manhã.', defaultQuantity: '30 comprimidos' },
  { id: '150', name: 'Diosmin 500mg', defaultPosology: 'Tomar 1 comprimido 2x ao dia.', defaultQuantity: '60 comprimidos' },
  { id: '151', name: 'Varicell', defaultPosology: 'Tomar 1 comprimido 2x ao dia.', defaultQuantity: '30 comprimidos' },
  { id: '152', name: 'Cenevit', defaultPosology: 'Tomar 1 comprimido ao dia.', defaultQuantity: '10 comprimidos' },
  { id: '153', name: 'Energil C', defaultPosology: 'Dissolver 1 comprimido ao dia.', defaultQuantity: '10 comprimidos' },
  { id: '154', name: 'Vitergan Zinco', defaultPosology: 'Tomar 1 drágea ao dia.', defaultQuantity: '30 drágeas' },
  { id: '155', name: 'Cewin', defaultPosology: 'Tomar conforme indicação.', defaultQuantity: '10 comprimidos' },
];

const DEFAULT_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'temp_1',
    name: 'Hipertensão (Padronizado)',
    items: [
      { medication: 'Losartana Potássica 50mg', quantity: '30 comprimidos', instructions: 'Tomar 1 comprimido via oral 1x ao dia pela manhã.' },
      { medication: 'Hidroclorotiazida 25mg', quantity: '30 comprimidos', instructions: 'Tomar 1 comprimido via oral 1x ao dia pela manhã.' }
    ],
    orientations: 'Monitorar pressão arterial em repouso. Manter dieta hipossódica.'
  },
  {
    id: 'temp_2',
    name: 'Diabetes Tipo 2 (Metformina)',
    items: [
      { medication: 'Metformina 850mg', quantity: '60 comprimidos', instructions: 'Tomar 1 comprimido após o café da manhã e 1 após o jantar.' }
    ],
    orientations: 'Evitar consumo de doces e massas brancas. Hidratar-se bem.'
  },
  {
    id: 'temp_3',
    name: 'Gastrite / Dispepsia',
    items: [
      { medication: 'Omeprazol 20mg', quantity: '28 cápsulas', instructions: 'Tomar 1 cápsula em jejum, 30 minutos antes do café da manhã.' }
    ],
    orientations: 'Evitar alimentos gordurosos, café e bebidas gasosas.'
  },
  {
    id: 'temp_4',
    name: 'Alergia / Urticária',
    items: [
      { medication: 'Loratadina 10mg', quantity: '10 comprimidos', instructions: 'Tomar 1 comprimido via oral 1x ao dia.' }
    ],
    orientations: 'Suspender uso em caso de sonolência excessiva. Evitar alérgenos conhecidos.'
  }
];

export default function Prescription() {
  const { drugstore, user } = useAuth();
  const [success, setSuccess] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [showMedBank, setShowMedBank] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState(false);
  const [medSaveSuccess, setMedSaveSuccess] = useState<number | null>(null);
  const [userTemplates, setUserTemplates] = useState<PrescriptionTemplate[]>([]);
  const [userMedications, setUserMedications] = useState<Medication[]>([]);
  const [deletedMedIds, setDeletedMedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [medSearchTerm, setMedSearchTerm] = useState('');

  // Load user data from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem('dr_roger_prescription_templates');
    if (savedTemplates) {
      try {
        setUserTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Failed to load user templates');
      }
    }

    const savedMeds = localStorage.getItem('dr_roger_user_medications');
    if (savedMeds) {
      try {
        setUserMedications(JSON.parse(savedMeds));
      } catch (e) {
        console.error('Failed to load user medications');
      }
    }

    const savedDeleted = localStorage.getItem('dr_roger_deleted_med_ids');
    if (savedDeleted) {
      try {
        setDeletedMedIds(JSON.parse(savedDeleted));
      } catch (e) {
        console.error('Failed to load deleted medication IDs');
      }
    }
  }, []);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm<PrescriptionForm>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      items: [{ medication: '', quantity: '', instructions: '' }],
      pharmacistName: drugstore?.pharmacist || '',
      pharmacistCrf: drugstore?.crf || '',
      validUntil: '30 dias'
    }
  });

  const items = watch('items');

  const addItem = () => {
    setValue('items', [...items, { medication: '', quantity: '', instructions: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setValue('items', items.filter((_, i) => i !== index));
    }
  };

  const applyTemplate = (template: PrescriptionTemplate) => {
    setValue('items', template.items);
    if (template.orientations) {
      setValue('orientations', template.orientations);
    }
    setShowBank(false);
  };

  const saveAsTemplate = () => {
    const templateName = prompt('Nome do Modelo para Salvar:', `Prescrição ${items[0]?.medication || 'Nova'}`);
    
    if (templateName) {
      const newTemplate: PrescriptionTemplate = {
        id: Math.random().toString(36).substr(2, 9),
        name: templateName,
        items: items,
        orientations: watch('orientations')
      };
      
      const updated = [...userTemplates, newTemplate];
      setUserTemplates(updated);
      localStorage.setItem('dr_roger_prescription_templates', JSON.stringify(updated));
      setTemplateSuccess(true);
      setTimeout(() => setTemplateSuccess(false), 3000);
    }
  };

  const saveMedication = (index: number) => {
    const medicationName = watch(`items.${index}.medication`);
    const instructions = watch(`items.${index}.instructions`);
    const quantity = watch(`items.${index}.quantity`);

    if (!medicationName || !instructions) {
      alert('Preencha o nome e as instruções para salvar o medicamento.');
      return;
    }

    const newMed: Medication = {
      id: Math.random().toString(36).substr(2, 9),
      name: medicationName,
      defaultPosology: instructions,
      defaultQuantity: quantity
    };

    const updated = [...userMedications, newMed];
    setUserMedications(updated);
    localStorage.setItem('dr_roger_user_medications', JSON.stringify(updated));
    setMedSaveSuccess(index);
    setTimeout(() => setMedSaveSuccess(null), 3000);
  };

  const updateMedication = (med: Medication) => {
    // Check if this is a default med we're editing or an existing user med
    const alreadyInUserMeds = userMedications.some(m => m.id === med.id);
    
    let updated;
    if (alreadyInUserMeds) {
      updated = userMedications.map(m => m.id === med.id ? med : m);
    } else {
      updated = [...userMedications, med];
    }

    setUserMedications(updated);
    localStorage.setItem('dr_roger_user_medications', JSON.stringify(updated));
    setEditingMed(null);
  };

  const deleteUserMed = (id: string, e: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Using a simple confirm first. If it fails to show, we might need a custom UI.
    const message = 'Deseja realmente excluir este medicamento?';
    if (!window.confirm(message)) return;

    try {
      // 1. Check if it's a default medication
      const isDefault = DEFAULT_MEDICATIONS.some(m => m.id === id);
      
      if (isDefault) {
        setDeletedMedIds(prev => {
          if (prev.includes(id)) return prev;
          const updated = [...prev, id];
          localStorage.setItem('dr_roger_deleted_med_ids', JSON.stringify(updated));
          return updated;
        });
      }
      
      // 2. Remove from user medications
      setUserMedications(prev => {
        const updated = prev.filter(m => m.id !== id);
        localStorage.setItem('dr_roger_user_medications', JSON.stringify(updated));
        return updated;
      });

      // 3. Clear editing if it was this medication
      if (editingMed?.id === id) {
        setEditingMed(null);
      }

      // 4. Show success feedback (reusing medSaveSuccess or creating a generic one)
      // I'll use medSaveSuccess with a special value for feedback
      setMedSaveSuccess(-2); // -2 will be "Deleted"
      setTimeout(() => setMedSaveSuccess(null), 2000);
      
    } catch (error) {
      console.error('Error deleting medication:', error);
      alert('Erro ao excluir medicamento.');
    }
  };

  const selectMedication = (med: Medication, index: number) => {
    setValue(`items.${index}.medication`, med.name);
    setValue(`items.${index}.quantity`, med.defaultQuantity);
    setValue(`items.${index}.instructions`, med.defaultPosology);
  };

  const onSubmit = (data: PrescriptionForm) => {
    console.log('Receituário Salvo:', data);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const generatePDF = (data: PrescriptionForm) => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Professional Watermark/Header
      doc.setFillColor(252, 252, 253);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Branding Logo Logic
      doc.setFontSize(22);
      doc.setTextColor(59, 130, 246); // blue-600
      doc.setFont('helvetica', 'bold');
      doc.text('DR. ROGER ', 20, 20);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('POP', doc.getTextWidth('DR. ROGER ') + 20, 20);
      
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('SISTEMAS DE QUALIDADE E CONFORMIDADE FARMACÊUTICA', 20, 25);

      // Receipt Title
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('RECEITUÁRIO FARMACÊUTICO', pageWidth / 2, 38, { align: 'center' });

      let currentY = 55;

      // Pharmacy Info (The "Where")
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.text(drugstore?.name?.toUpperCase() || 'DROGARIA', 15, currentY);
      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`ENDEREÇO: ${drugstore?.address || 'NÃO INFORMADO'}`, 15, currentY);
      currentY += 4;
      doc.text(`CNPJ: ${drugstore?.cnpj || '-'} | CRF: ${drugstore?.crf || '-'}`, 15, currentY);
      
      currentY += 12;

      // Patient Section
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, currentY, pageWidth - 30, 25, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('PACIENTE:', 20, currentY + 8);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(data.patientName.toUpperCase(), 20, currentY + 14);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`ENDEREÇO: ${data.patientAddress || 'NÃO INFORMADO'}`, 20, currentY + 20);
      
      currentY += 35;

      // Prescription Body
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('PRESCRIÇÃO E ORIENTAÇÕES DE USO:', 15, currentY);
      currentY += 10;

      data.items.forEach((item, index) => {
        if (currentY > pageHeight - 80) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${item.medication.toUpperCase()}`, 15, currentY);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Qtd: ${item.quantity}`, pageWidth - 15, currentY, { align: 'right' });
        currentY += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30);
        doc.setFontSize(9);
        const splitInstructions = doc.splitTextToSize(item.instructions, pageWidth - 40);
        doc.text(splitInstructions, 20, currentY);
        currentY += (splitInstructions.length * 5) + 10;
        
        doc.setDrawColor(241, 245, 249);
        doc.line(15, currentY - 6, pageWidth - 15, currentY - 6);
      });

      // Special Orientations
      if (data.orientations) {
        if (currentY > pageHeight - 70) {
          doc.addPage();
          currentY = 20;
        }
        currentY += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 64, 175); // blue-800
        doc.text('ORIENTAÇÕES ADICIONAIS DO FARMACÊUTICO:', 15, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const splitOrientations = doc.splitTextToSize(data.orientations, pageWidth - 30);
        doc.text(splitOrientations, 15, currentY);
      }

      // Legal & Validity
      currentY = pageHeight - 75;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      const notice = "Este documento constitui um Receituário Farmacêutico conforme Resolução CFF correspondente. Não substitui prescrição médica para medicamentos de venda sob prescrição, exceto nos casos previstos em lei para o âmbito de atuação farmacêutica.";
      doc.text(doc.splitTextToSize(notice, pageWidth - 40), 20, currentY);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Validade da orientação: ${data.validUntil || '30 dias'}`, 20, currentY + 12);

      // Final Signatures
      currentY = pageHeight - 45;
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(pageWidth / 2 - 40, currentY, pageWidth / 2 + 40, currentY);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(data.pharmacistName.toUpperCase(), pageWidth / 2, currentY + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`FARMACÊUTICO(A) PRESPRITOR - CRF: ${data.pharmacistCrf}`, pageWidth / 2, currentY + 9, { align: 'center' });
      doc.text('CARIMBO E ASSINATURA', pageWidth / 2, currentY + 13, { align: 'center' });

      // Clean Footer
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`${drugstore?.name || 'Drogaria'} - Emitido via Dr. Roger POP em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      saveAs(doc.output('blob'), `Receita_${data.patientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  const allTemplates = [...DEFAULT_TEMPLATES, ...userTemplates];
  const filteredTemplates = allTemplates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const allMedications = React.useMemo(() => {
    // 1. Filter defaults: remove deleted and those modified by user
    const filteredDefaults = DEFAULT_MEDICATIONS.filter(
      defMed => !deletedMedIds.includes(defMed.id) && !userMedications.some(userMed => userMed.id === defMed.id)
    );
    // 2. Combine with user medications (which include modified defaults)
    return [...filteredDefaults, ...userMedications].sort((a, b) => a.name.localeCompare(b.name));
  }, [userMedications, deletedMedIds]);

  const filteredMeds = allMedications.filter(m => m.name.toLowerCase().includes(medSearchTerm.toLowerCase()));

  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  return (
    <div className="space-y-10 px-1 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center border border-white/20">
              <Pill size={32} className="drop-shadow-md" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md border border-slate-50">
              <ShieldCheck size={14} className="text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Receituário Profissional
              <span className="text-[10px] bg-blue-50 text-blue-600 font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100">Eletrônico</span>
            </h1>
            <p className="text-sm text-slate-400 font-bold tracking-tight uppercase mt-0.5">Gestão de Prescrições e Orientações Farmacêuticas</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setShowBank(true)}
            className="btn-secondary flex items-center gap-2 group"
          >
            <BookOpen size={18} className="group-hover:scale-110 transition-transform" />
            <span className="uppercase tracking-widest text-[10px] font-black">Banco de Modelos</span>
          </button>
          
          <button 
            type="button"
            onClick={handleSubmit(generatePDF)}
            disabled={generating}
            className="btn-secondary flex items-center gap-2"
          >
            {generating ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
            <span className="uppercase tracking-widest text-[10px] font-black">Imprimir PDF</span>
          </button>
          
          <button 
            type="submit"
            form="prescription-form"
            className="btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            <span className="uppercase tracking-widest text-[10px] font-black">Salvar Histórico</span>
          </button>
        </div>
      </div>

      {/* Templates Modal/Panel */}
      {showBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <BookOpen size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Banco de Prescrições</h3>
              </div>
              <button onClick={() => setShowBank(false)} className="text-slate-400 hover:text-slate-600 translate-x-2 p-2">
                <Trash2 size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por medicamento ou condição..." 
                  className="input-field pl-12 bg-slate-50 border-transparent focus:bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="flex flex-col text-left p-5 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-black text-slate-800 uppercase tracking-tight text-sm">{template.name}</span>
                      <Plus size={16} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="space-y-1">
                      {template.items.map((i, idx) => (
                        <p key={idx} className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                          • {i.medication} ({i.quantity})
                        </p>
                      ))}
                    </div>
                  </button>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                      <Search size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum modelo encontrado</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/30 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecione um modelo para preencher automaticamente</p>
            </div>
          </div>
        </div>
      )}

      {/* Medications Modal */}
      {showMedBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[70vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Pill size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                  {editingMed ? "Editar Medicamento" : "Banco de Medicamentos"}
                </h3>
              </div>
              <button 
                onClick={() => { 
                  setShowMedBank(false); 
                  setActiveItemIndex(null); 
                  setEditingMed(null); 
                }} 
                className="text-slate-400 hover:text-slate-600 translate-x-2 p-2"
              >
                <Trash2 size={20} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {editingMed ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Nome do Medicamento</label>
                    <input 
                      type="text" 
                      className="input-field bg-slate-50" 
                      value={editingMed.name}
                      onChange={(e) => setEditingMed({ ...editingMed, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Quantidade Padrão</label>
                    <input 
                      type="text" 
                      className="input-field bg-slate-50" 
                      value={editingMed.defaultQuantity}
                      onChange={(e) => setEditingMed({ ...editingMed, defaultQuantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Posologia Padrão</label>
                    <textarea 
                      rows={4}
                      className="input-field bg-slate-50" 
                      value={editingMed.defaultPosology}
                      onChange={(e) => setEditingMed({ ...editingMed, defaultPosology: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setEditingMed(null)}
                      className="flex-1 btn-secondary uppercase text-[10px] font-black tracking-widest"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button"
                      onClick={() => updateMedication(editingMed)}
                      className="flex-1 btn-primary bg-indigo-600 hover:bg-indigo-700 uppercase text-[10px] font-black tracking-widest"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome do medicamento..." 
                      className="input-field pl-12 bg-slate-50 border-transparent focus:bg-white"
                      value={medSearchTerm}
                      onChange={(e) => setMedSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {filteredMeds.map((med) => {
                      const isUserMed = userMedications.some(m => m.id === med.id);
                      return (
                        <div
                          key={med.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group relative cursor-pointer"
                          onClick={() => {
                            if (activeItemIndex !== null) {
                              selectMedication(med, activeItemIndex);
                              setShowMedBank(false);
                              setActiveItemIndex(null);
                            }
                          }}
                        >
                          <div className="flex flex-col pr-12">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 uppercase tracking-tight text-xs">{med.name}</span>
                              {isUserMed && (
                                <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black border border-indigo-100">MEU</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[280px]">{med.defaultPosology}</span>
                          </div>
                          
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-20">
                            <button 
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingMed(med); }}
                              className="p-2 text-indigo-600 hover:bg-white rounded-lg transition-colors shadow-sm bg-indigo-50/50 hover:shadow-md pointer-events-auto"
                              title="Editar Medicamento"
                            >
                              <Edit size={14} /> 
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => deleteUserMed(med.id, e)}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors shadow-sm bg-red-50/50 hover:shadow-md pointer-events-auto"
                              title="Excluir Medicamento"
                            >
                              <Trash2 size={14} /> 
                            </button>
                            <div className="p-2 text-indigo-600 ml-2">
                              <Plus size={14} className="group-hover:scale-125 transition-transform" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredMeds.length === 0 && (
                      <div className="py-10 text-center space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum medicamento encontrado</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <form id="prescription-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Patient Section */}
          <div className="card bg-white p-8 space-y-8 shadow-xl shadow-slate-200/50 border-none">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <User className="text-blue-600" size={20} />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Identificação do Paciente</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome do Paciente / Beneficiário</label>
                <input {...register('patientName')} className="input-field bg-slate-50 text-lg font-black tracking-tight" placeholder="Nome Completo..." />
                {errors.patientName && <p className="text-xs text-red-500 font-bold">{errors.patientName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <MapPin size={12} className="text-slate-300" /> Endereço do Paciente
                </label>
                <input {...register('patientAddress')} className="input-field bg-slate-50" placeholder="Rua, Número, Bairro, Cidade..." />
              </div>
            </div>
          </div>

          {/* Medications Section */}
          <div className="card bg-white p-8 space-y-8 shadow-xl shadow-slate-200/50 border-none">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-600" size={20} />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Itens da Prescrição</h3>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={saveAsTemplate}
                  className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors"
                >
                  <Save size={14} /> Salvar como Modelo
                </button>
                <button 
                  type="button" 
                  onClick={addItem}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-black text-[10px] uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100/50"
                >
                  <Plus size={14} /> Adicionar Item
                </button>
              </div>
            </div>

            <div className="space-y-10">
              {items.map((item, index) => (
                <div key={index} className="relative group/item bg-slate-50/50 p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="absolute -top-3 -left-2 w-10 h-10 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-sm font-black text-blue-600 shadow-lg">
                    {index + 1}
                  </div>
                  
                  {items.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeItem(index)}
                      className="absolute top-5 right-5 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                        <span>Medicamento / Fórmula Ativa</span>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button" 
                            onClick={() => { setActiveItemIndex(index); setShowMedBank(true); }}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Search size={10} /> BUSCAR NO BANCO
                          </button>
                          <div className="relative">
                            <button 
                              type="button" 
                              onClick={() => saveMedication(index)}
                              className="text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                            >
                              <Save size={10} /> SALVAR NESTE BANCO
                            </button>
                            {medSaveSuccess === index && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm whitespace-nowrap">
                                SALVO!
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                      <input {...register(`items.${index}.medication`)} className="input-field bg-white font-bold" placeholder="Ex: Metformina 850mg" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Qtd / Volume</label>
                      <input {...register(`items.${index}.quantity`)} className="input-field bg-white" placeholder="Ex: 60 comprimidos" />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Instruções de Uso / Posologia</label>
                      <textarea {...register(`items.${index}.instructions`)} rows={3} className="input-field bg-white leading-relaxed" placeholder="Ex: Tomar 1 comprimido após as principais refeições..." />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="card bg-white p-8 space-y-8 shadow-xl shadow-slate-200/50 border-none">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <UserCheck className="text-blue-600" size={18} />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Responsabilidade</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Farmacêutico Prescritor</label>
                <input {...register('pharmacistName')} className="input-field bg-slate-50 font-bold" placeholder="Nome do Farmacêutico..." />
                {errors.pharmacistName && <p className="text-xs text-red-500 font-bold">{errors.pharmacistName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">CRF do Profissional</label>
                <input {...register('pharmacistCrf')} className="input-field bg-slate-50 font-bold" placeholder="Ex: CRF-SP 123456" />
                {errors.pharmacistCrf && <p className="text-xs text-red-500 font-bold">{errors.pharmacistCrf.message}</p>}
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Orientação Geral / Dietética</label>
                <textarea {...register('orientations')} rows={4} className="input-field bg-slate-50" placeholder="Orientações de saúde..." />
              </div>

              <div className="grid grid-cols-1 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Clock size={14} className="text-slate-300" /> Validade da Prescrição
                  </label>
                  <select {...register('validUntil')} className="input-field bg-slate-50 font-black text-sm cursor-pointer">
                    <option value="30 dias">30 dias</option>
                    <option value="60 dias">60 dias</option>
                    <option value="90 dias">90 dias</option>
                    <option value="180 dias">180 dias</option>
                    <option value="6 meses">6 meses</option>
                    <option value="Tratamento Contínuo">Tratamento Contínuo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-slate-900 p-8 space-y-8 shadow-xl shadow-blue-900/30 border-none text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 blur-[100px] rounded-full group-hover:bg-blue-600/20 transition-colors"></div>
            
            <div className="space-y-6 relative z-10">
              <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Stethoscope size={28} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black tracking-tighter uppercase">Local da Emissão</h4>
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{drugstore?.name || 'Unidade Farmacêutica'}</p>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed italic border-l-2 border-blue-600/30 pl-4">
                    {drugstore?.address || 'Endereço não configurado no perfil.'}
                  </p>
                </div>
              </div>
              
              {success && (
                <div className="flex items-center gap-3 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 animate-bounce">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Prescrição Salva com Sucesso!</span>
                </div>
              )}
              {templateSuccess && (
                <div className="flex items-center gap-3 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 animate-bounce">
                  <BookOpen size={20} className="text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Modelo Salvo no Banco!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Toast Notifications */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center space-x-3"
            >
              <Check size={20} />
              <span className="font-bold uppercase tracking-widest text-[10px]">Receituário salvo com sucesso!</span>
            </motion.div>
          )}
          {medSaveSuccess !== null && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`${medSaveSuccess === -2 ? 'bg-red-500' : 'bg-indigo-600'} text-white px-6 py-4 rounded-2xl shadow-xl flex items-center space-x-3`}
            >
              {medSaveSuccess === -2 ? <Trash2 size={20} /> : <Check size={20} />}
              <span className="font-bold uppercase tracking-widest text-[10px]">
                {medSaveSuccess === -2 ? 'Medicamento excluído do banco!' : 'Medicamento salvo no seu banco!'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
