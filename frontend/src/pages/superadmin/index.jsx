// pages/superadmin/index.jsx
import { useState } from 'react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import SuperAdminLogin  from './Login';
import SuperAdminLayout from './Layout';
import Dashboard        from './Dashboard';
import Psicologos       from './Psicologos';
import Empresas         from './Empresas';
import Auditoria        from './Auditoria';

const PAGINAS = {
  dashboard:  <Dashboard />,
  psicologos: <Psicologos />,
  empresas:   <Empresas />,
  auditoria:  <Auditoria />,
};

export default function SuperAdminApp() {
  const { token } = useSuperAdmin();
  const [pagina, setPagina] = useState('dashboard');

  if (!token) return <SuperAdminLogin />;

  return (
    <SuperAdminLayout pagina={pagina} setPagina={setPagina}>
      {PAGINAS[pagina]}
    </SuperAdminLayout>
  );
}
