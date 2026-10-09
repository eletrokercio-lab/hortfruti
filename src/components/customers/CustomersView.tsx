import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  MapPin,
  Phone,
  MessageCircle,
  CreditCard,
  ChevronRight,
  Trash2,
  X,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer, PaymentMethod, PaymentTerm } from '../../types';
import { formatBRL, formatPhone } from '../../utils/formatters';

interface CustomersViewProps {
  onSelectCustomer: (id: string) => void;
  onOpenNewOrderForCustomer: (id: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onSelectCustomer,
  onOpenNewOrderForCustomer,
}) => {
  const { customers, createCustomer, getCustomerCrateBalance, deleteCustomer } = useApp();

  const handleDeleteCustomer = (cust: Customer) => {
    if (
      window.confirm(
        `Excluir o cliente "${cust.name}"?\n\nO cadastro, os preços exclusivos e as promoções dele serão removidos. O histórico de pedidos antigos é mantido.`
      )
    ) {
      deleteCustomer(cust.id);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Form state for new customer
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Campinas');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('boleto');
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('7d');
  const [creditLimit, setCreditLimit] = useState<number>(10000);
  const [commercialCondition, setCommercialCondition] = useState('Tabela Atacado');
  const [notes, setNotes] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tradeName && c.tradeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.document.includes(searchTerm) ||
      c.address.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !document) return;

    createCustomer({
      name,
      tradeName,
      document,
      phone,
      whatsapp,
      address: {
        street,
        number,
        neighborhood,
        city,
        state,
        zipCode,
        reference,
      },
      status: 'active',
      paymentMethod,
      paymentTerm,
      creditLimit,
      commercialCondition,
      notes,
    });

    setIsNewModalOpen(false);
    // Reset form
    setName('');
    setTradeName('');
    setDocument('');
    setPhone('');
    setWhatsapp('');
    setStreet('');
    setNumber('');
    setNeighborhood('');
    setZipCode('');
    setReference('');
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            Clientes & Contas Comerciais
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cadastros, preços exclusivos por cliente, limites de crédito e vasilhames
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, razão social, CNPJ/CPF ou bairro..."
          className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-2xs"
        />
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-200">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filtered.map((cust) => {
            const crateBal = getCustomerCrateBalance(cust.id);
            return (
              <div
                key={cust.id}
                onClick={() => onSelectCustomer(cust.id)}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4.5 shadow-2xs hover:border-emerald-300 hover:shadow-xs cursor-pointer transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-sm text-gray-900 leading-tight">{cust.name}</h3>
                      {cust.tradeName && (
                        <p className="text-xs text-emerald-800 font-semibold">{cust.tradeName}</p>
                      )}
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">Doc: {cust.document}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        {cust.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomer(cust);
                        }}
                        title="Excluir cliente"
                        className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-700 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>{cust.address.street}, {cust.address.number} • {cust.address.neighborhood}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-gray-500">
                      <CreditCard className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>Prazo: {cust.paymentTerm} • Limite: {formatBRL(cust.creditLimit)}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-blue-500" />
                      Caixas retidas: <strong className="text-blue-800">{crateBal}</strong>
                    </span>

                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      Ver Ficha <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: New Customer */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-emerald-50/60">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-gray-900">Novo Cadastro de Cliente</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome / Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Sacolão das Frutas Ltda"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: Sacolão Central"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">CPF ou CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Telefone Fixo</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 3222-1100"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="11999887766"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                  Endereço de Entrega
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Logradouro (Rua/Av)</label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua das Palmeiras"
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Número</label>
                    <input
                      type="text"
                      required
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="120"
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      required
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Centro"
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">CEP</label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="13000-000"
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Condição comercial */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Forma de Pagto</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    <option value="boleto">Boleto</option>
                    <option value="pix">Pix</option>
                    <option value="cash">Dinheiro</option>
                    <option value="transfer">Transferência</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Prazo Padrão</label>
                  <select
                    value={paymentTerm}
                    onChange={(e) => setPaymentTerm(e.target.value as PaymentTerm)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    <option value="sight">À vista na entrega</option>
                    <option value="7d">7 dias</option>
                    <option value="15d">15 dias</option>
                    <option value="30d">30 dias</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Limite de Crédito (R$)</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observações de Recebimento</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Descarregar até 08h30. Conferir caixas no ato."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
