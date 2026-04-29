export default function Loader({ visible }) {
  if (!visible) return null;
  return (
    <div id="loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <img src="/images/loadgif.gif" alt="Chargement..." style={{ width: '60px' }} />
    </div>
  );
}
