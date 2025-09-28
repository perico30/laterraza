import React from 'react';
import { useAppContext } from '../context/AppContext';

const Footer = () => {
    const { settings } = useAppContext();

    return (
        <footer className="bg-surface border-t border-border mt-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                    <p className="text-sm text-text-secondary mb-4 sm:mb-0">
                        {settings.footerText}
                    </p>
                    <div className="flex items-center space-x-5">
                        {settings.socialLinks.map(link => (
                            link.url && link.iconUrl && (
                                <a 
                                    key={link.id} 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-text-secondary hover:opacity-80 transition-opacity"
                                    aria-label={link.platform}
                                >
                                    <img src={link.iconUrl} alt={link.platform} className="w-6 h-6 object-contain" />
                                </a>
                            )
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;