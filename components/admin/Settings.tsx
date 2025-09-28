import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { AppSettings } from '../../types';
import { uploadFile } from '../../firebase/config';

const Settings = () => {
  const { settings, updateSettings } = useAppContext();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saveMessage, setSaveMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileUpload = async (file: File, field: 'logoUrl' | 'paymentQrCodeUrl') => {
    setIsUploading(true);
    try {
        const filePath = `settings/${field}/${Date.now()}-${file.name}`;
        const downloadURL = await uploadFile(file, filePath);
        setLocalSettings(prev => ({...prev, [field]: downloadURL}));
    } catch (error) {
        console.error("Error uploading file:", error);
        alert("Error al subir el archivo.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'paymentQrCodeUrl') => {
      if (e.target.files && e.target.files[0]) {
          handleFileUpload(e.target.files[0], field);
      }
  };

  const addSocialLink = () => {
    setLocalSettings(prev => ({
        ...prev,
        socialLinks: [...prev.socialLinks, { id: `social-${Date.now()}`, platform: '', url: '', iconUrl: null }]
    }));
  };

  const removeSocialLink = (id: string) => {
    setLocalSettings(prev => ({
        ...prev,
        socialLinks: prev.socialLinks.filter(link => link.id !== id)
    }));
  };

  const handleSocialLinkChange = (id: string, field: 'platform' | 'url', value: string) => {
    setLocalSettings(prev => ({
        ...prev,
        socialLinks: prev.socialLinks.map(link => 
            link.id === id ? { ...link, [field]: value } : link
        )
    }));
  };

  const handleSocialLinkIconChange = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setIsUploading(true);
        try {
            const file = e.target.files[0];
            const filePath = `settings/social_icons/${Date.now()}-${file.name}`;
            const downloadURL = await uploadFile(file, filePath);
            setLocalSettings(prev => ({
                ...prev,
                socialLinks: prev.socialLinks.map(link => 
                    link.id === id ? { ...link, iconUrl: downloadURL } : link
                )
            }));
        } catch (error) {
             console.error("Error uploading social icon:", error);
             alert("Error al subir el icono.");
        } finally {
            setIsUploading(false);
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(localSettings);
    setSaveMessage('¡Ajustes guardados con éxito!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-text-primary">Ajustes Generales</h1>
      <form onSubmit={handleSubmit} className="bg-surface rounded-xl p-6 border border-border max-w-2xl space-y-8 relative">
        {isUploading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 rounded-xl">
            <p className="text-white font-bold text-lg animate-pulse">Subiendo...</p>
            </div>
        )}
        <div>
            <h2 className="text-xl font-semibold mb-4 text-text-primary">Marca y Apariencia</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Subir Logo</label>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'logoUrl')} className="bg-background border border-border rounded-lg p-2 w-full text-sm text-text-secondary file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30" />
                    {localSettings.logoUrl && <img src={localSettings.logoUrl} alt="Logo Preview" className="mt-4 h-10 w-auto bg-white/10 p-1 rounded-md" />}
                </div>
                 <div>
                    <label htmlFor="primaryColor" className="block text-sm font-medium text-text-secondary mb-1">Color Principal (botones, enlaces)</label>
                    <div className="flex items-center gap-2">
                         <input type="color" id="primaryColor" name="primaryColor" value={localSettings.primaryColor} onChange={handleChange} className="p-1 h-10 w-10 block bg-background border border-border cursor-pointer rounded-lg" />
                         <input type="text" value={localSettings.primaryColor} onChange={handleChange} name="primaryColor" className="bg-background border border-border rounded-lg p-2 w-full" />
                    </div>
                </div>
                 <div>
                    <label htmlFor="backgroundColor" className="block text-sm font-medium text-text-secondary mb-1">Color de Fondo</label>
                    <div className="flex items-center gap-2">
                         <input type="color" id="backgroundColor" name="backgroundColor" value={localSettings.backgroundColor} onChange={handleChange} className="p-1 h-10 w-10 block bg-background border border-border cursor-pointer rounded-lg" />
                         <input type="text" value={localSettings.backgroundColor} onChange={handleChange} name="backgroundColor" className="bg-background border border-border rounded-lg p-2 w-full" />
                    </div>
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-xl font-semibold mb-4 text-text-primary">Método de Pago</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Subir QR de Pago</label>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'paymentQrCodeUrl')} className="bg-background border border-border rounded-lg p-2 w-full text-sm text-text-secondary file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30" />
                    {localSettings.paymentQrCodeUrl && <img src={localSettings.paymentQrCodeUrl} alt="QR de Pago Preview" className="mt-4 h-32 w-32 object-contain bg-white p-1 rounded-md" />}
                </div>
            </div>
        </div>


        <div>
            <h2 className="text-xl font-semibold mb-4 text-text-primary">Pie de Página y Redes Sociales</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="footerText" className="block text-sm font-medium text-text-secondary mb-1">Texto del Pie de Página</label>
                    <textarea id="footerText" name="footerText" value={localSettings.footerText} onChange={handleChange} rows={2} className="bg-background border border-border rounded-lg p-2 w-full"></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Enlaces a Redes Sociales</label>
                    <div className="space-y-3">
                        {localSettings.socialLinks.map((link) => (
                          <div key={link.id} className="p-3 bg-background rounded-lg border border-border space-y-3 relative">
                              <button type="button" onClick={() => removeSocialLink(link.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700" aria-label="Eliminar red social">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                              </button>
                              <input type="text" value={link.platform} onChange={(e) => handleSocialLinkChange(link.id, 'platform', e.target.value)} placeholder="Plataforma (ej: Facebook)" className="bg-surface border border-border rounded-lg p-2 w-full" />
                              <input type="url" value={link.url} onChange={(e) => handleSocialLinkChange(link.id, 'url', e.target.value)} placeholder="https://facebook.com/tu-pagina" className="bg-surface border border-border rounded-lg p-2 w-full" />
                              <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <label className="block text-xs font-medium text-text-secondary mb-1">Subir Icono</label>
                                    <input type="file" accept="image/*" onChange={(e) => handleSocialLinkIconChange(link.id, e)} className="bg-surface border border-border rounded-lg p-1.5 w-full text-xs text-text-secondary file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30" />
                                  </div>
                                  {link.iconUrl && <img src={link.iconUrl} alt={`${link.platform} logo`} className="w-8 h-8 rounded-md object-contain bg-white/10 p-1" />}
                              </div>
                          </div>
                        ))}
                    </div>
                    <button type="button" onClick={addSocialLink} className="text-primary hover:text-accent font-semibold mt-4 text-sm">+ Añadir Red Social</button>
                </div>
            </div>
        </div>

        <div className="flex justify-end items-center gap-4 border-t border-border pt-4 mt-8">
            {saveMessage && <p className="text-green-400 text-sm">{saveMessage}</p>}
            <button type="submit" className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg transition">Guardar Cambios</button>
        </div>
      </form>
    </div>
  );
};

export default Settings;