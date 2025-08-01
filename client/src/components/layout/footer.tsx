export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <i className="fas fa-landmark text-white text-xs"></i>
              </div>
              <span className="font-semibold text-gray-900">EU MEP Watch</span>
            </div>
            <p className="text-sm text-slate-gray">
              Professional database for EU Parliament monitoring and policy analysis.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-gray">
              <li>
                <a href="#" className="hover:text-gray-900">
                  API Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900">
                  Data Export Guide
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900">
                  User Manual
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900">
                  Support
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Data Sources</h4>
            <p className="text-sm text-slate-gray mb-2">
              Data sourced from European Parliament official APIs
            </p>
            <p className="text-sm text-slate-gray">GDPR compliant • Updated daily</p>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-6 text-center">
          <p className="text-sm text-slate-gray">
            © 2024 EU MEP Watch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
