
import React, { useMemo } from 'react';
import { LogEntry, Zona } from '../types';

interface AnalysisDashboardProps {
  log: LogEntry[];
}

const ACOES = ['Ofensiva', 'Ataque', 'Defesa', 'Recuo', 'Contra-Ataque', 'Ponto do A', 'Ponto do B'];
const ZONAS: Zona[] = ['Casa', 'Quadrado', 'House'];

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ log }) => {
  const stats = useMemo(() => {
    const totalAcoes = log.length;

    const contagemAcoes = ACOES.reduce((acc, acao) => {
      acc[acao] = 0;
      return acc;
    }, {} as Record<string, number>);

    const distribuicaoZona = ZONAS.reduce((acc, zona) => {
      acc[zona] = { total: 0 };
      ACOES.forEach(a => acc[zona][a] = 0);
      return acc;
    }, {} as Record<Zona, any>);
    
    log.forEach(entry => {
      if (ACOES.includes(entry.acao)) {
        contagemAcoes[entry.acao]++;
      }
      if (ZONAS.includes(entry.zona) && ACOES.includes(entry.acao)) {
        distribuicaoZona[entry.zona].total++;
        distribuicaoZona[entry.zona][entry.acao]++;
      }
    });

    return { totalAcoes, contagemAcoes, distribuicaoZona };
  }, [log]);

  return (
    <section className="mt-8 border-t pt-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Dashboard de Análise</h2>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2 text-gray-700">Contagem de Ações:</h3>
        <div id="dashboard-contagem" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACOES.map(acao => (
            <div key={acao} className="p-2 bg-gray-100 rounded-lg shadow-sm">
              <span className="font-medium text-gray-600">{acao.replace('Ponto do ', 'Ponto ')}:</span>
              <span className="font-bold text-lg text-gray-800 ml-2">{stats.contagemAcoes[acao] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2 text-gray-700">Distribuição de Ações por Zona:</h3>
        <div id="dashboard-zona" className="space-y-3">
          {ZONAS.map(zona => {
            const totalZona = stats.distribuicaoZona[zona]?.total || 0;
            const percentual = stats.totalAcoes > 0 ? ((totalZona / stats.totalAcoes) * 100).toFixed(1) : 0;
            return (
              <div key={zona} className="flex flex-col p-3 bg-gray-100 rounded-lg">
                <span className="font-bold text-base text-gray-800">{zona}: {totalZona} Ações ({percentual}%)</span>
                {totalZona > 0 && (
                  <div className="flex flex-wrap pt-1 text-xs text-gray-600 gap-x-3 gap-y-1">
                    {ACOES.map(acao => {
                      const count = stats.distribuicaoZona[zona][acao] || 0;
                      return count > 0 ? (
                        <span key={acao}>{acao.replace('Ponto do ', 'Ponto ')} ({count})</span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2 text-gray-700">Log Completo da Partida ({log.length} Eventos):</h3>
        <div className="max-h-60 overflow-y-scroll bg-gray-100 p-1 rounded-lg border text-sm responsive-table">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 bg-gray-200 z-10">
              <tr>
                <th className="py-2 px-3 border-b">ID</th>
                <th className="py-2 px-3 border-b">Ação</th>
                <th className="py-2 px-3 border-b">Placar (A:B)</th>
                <th className="py-2 px-3 border-b">Zona</th>
              </tr>
            </thead>
            <tbody>
              {log.slice().reverse().map((entry) => (
                <tr key={entry.id} className="bg-white border-b">
                  <td className="py-1.5 px-3 text-gray-500">{entry.id}</td>
                  <td className="py-1.5 px-3 font-medium">{entry.acao.replace('Ponto do ', 'Ponto ')}</td>
                  <td className="py-1.5 px-3">{entry.placarA}:{entry.placarB}</td>
                  <td className="py-1.5 px-3 text-xs">{entry.zona}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default AnalysisDashboard;
