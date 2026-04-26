export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">Visão Geral</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Vendas Hoje</h3>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">R$ 0,00</p>
        </div>
        {/* Outros cards... */}
      </div>
    </div>
  );
}