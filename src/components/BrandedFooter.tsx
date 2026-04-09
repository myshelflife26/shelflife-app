import packageInfo from '../../package.json';

export function BrandedFooter() {
  return (
    <footer className="mt-auto py-6 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">ShelfLife</span>
            <span>·</span>
            <span>Where collections live</span>
            <span className="text-gray-400">·</span>
            <span className="text-xs">v{packageInfo.version}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/myshelflife"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              @myshelflife
            </a>
            <span className="text-gray-400">·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
