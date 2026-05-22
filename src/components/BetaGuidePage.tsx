import { Book, CheckCircle, AlertCircle, MessageSquare, Users, Heart, Flame, ThumbsUp, Mail, Eye, Package, Search } from 'lucide-react';

function BetaGuidePage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8">
        <div className="flex items-center gap-3 mb-4">
          <Book className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Beta Guide</h1>
        </div>
        <p className="text-lg opacity-90">
          Welcome to the G.I. Joe Action Figure Tracker beta! This guide will help you get started and provide important information about testing.
        </p>
      </div>

      {/* Getting Started */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Getting Started</h2>
        </div>

        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">1. Add Your First Figure</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Click the <Package className="inline h-4 w-4" /> "Add Figure" button</li>
              <li>Use "Search Database" to find popular figures quickly</li>
              <li>Fill in the details (name, manufacturer, condition, value, etc.)</li>
              <li>Upload images and set a main image</li>
              <li>Choose if you want it public or private</li>
              <li>Your figure is automatically saved to the cloud!</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">2. Make Your Collection Public</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Go to Settings and enable "Make Collection Public"</li>
              <li>Other users can now see your public figures</li>
              <li>You control which figures are public/private</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">3. Browse & React to Others</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Visit the <Eye className="inline h-4 w-4" /> Feed to see public figures</li>
              <li>Click <Search className="inline h-4 w-4" /> Browse to explore collections</li>
              <li>React with <Flame className="inline h-4 w-4 text-orange-500" /> Fire, <Heart className="inline h-4 w-4 text-pink-500" /> Love, or <ThumbsUp className="inline h-4 w-4 text-blue-500" /> Like</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">4. Connect With Collectors</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Send admirer requests to follow other collectors</li>
              <li>Send messages to discuss trades or purchases</li>
              <li>Mark figures as "For Sale" or "For Trade"</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Master Figures Database */}
      <section className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg p-6 shadow">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Master Figures Database</h2>
        </div>

        <div className="space-y-3 text-green-50">
          <p>
            The app now features a shared master figures database that makes adding figures faster and more consistent!
          </p>

          <div className="bg-white/10 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg">How It Works:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>When you add a new figure, click "Search Database" to find it instantly</li>
              <li>If the figure exists, all details are auto-filled for you</li>
              <li>When you add a new figure, it's automatically added to the master database</li>
              <li>Everyone benefits from figures added by other collectors</li>
            </ul>
          </div>

          <div className="bg-white/10 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg">For Admins:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>View all master figures in Settings → Figure Database</li>
              <li>Edit or delete entries to maintain quality</li>
              <li>Bulk import figures from JSON files</li>
              <li>Migrate your existing collection to the database</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Core Features to Test</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Collection Management</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Search master database for quick adds</li>
              <li>Add/edit/delete figures</li>
              <li>Upload multiple images</li>
              <li>Set image positions</li>
              <li>Make figures public/private</li>
              <li>Import/export data (backup)</li>
            </ul>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Social Features</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Browse public collections</li>
              <li>React to figures (fire, love, like)</li>
              <li>Send/receive admirer requests</li>
              <li>View jealousy scores & rankings</li>
              <li>Track rising stars</li>
            </ul>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Communication</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Send messages to collectors you connect with</li>
              <li>Paid users can message admirers</li>
              <li>Reference specific figures in messages</li>
              <li>Mark figures for sale/trade</li>
              <li>Contact owners about listings</li>
            </ul>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Organization</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Search and filter figures</li>
              <li>View in gallery, table, or stats mode</li>
              <li>Track figure values over time</li>
              <li>Custom fields for your collection</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Important Notes */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Important Notes</h2>
        </div>

        <div className="space-y-3 text-gray-700 dark:text-gray-300">
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <p className="font-semibold text-gray-900 dark:text-white">Cloud Storage</p>
            <p className="text-sm">All your data is stored in Firebase cloud storage. Access your collection from any device by logging in with your account!</p>
          </div>

          <div className="border-l-4 border-green-500 pl-4 py-2">
            <p className="font-semibold text-gray-900 dark:text-white">Master Figures Database</p>
            <p className="text-sm">When you add figures, they're automatically contributed to the master database (if new). This helps other collectors find popular figures quickly!</p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4 py-2">
            <p className="font-semibold text-gray-900 dark:text-white">Real Multi-User System</p>
            <p className="text-sm">This is a true multi-user platform with Firebase authentication. Users, collections, reactions, messages, and admirers are all shared in real-time!</p>
          </div>

          <div className="border-l-4 border-orange-500 pl-4 py-2">
            <p className="font-semibold text-gray-900 dark:text-white">Image Storage</p>
            <p className="text-sm">Images are stored as base64 data in Firebase. While there's no hard limit, try to keep image sizes reasonable for best performance.</p>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4 py-2">
            <p className="font-semibold text-gray-900 dark:text-white">Messaging Restrictions</p>
            <p className="text-sm">Free users can receive but not send messages. Paid users can message collectors they admire or who admire them. Build connections through admirer requests!</p>
          </div>
        </div>
      </section>

      {/* Beta Feedback */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How to Provide Feedback</h2>
        </div>

        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>Your feedback is crucial for improving this app! Here's what to look for:</p>

          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">What to Test & Report:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Bugs:</strong> Things that don't work or error messages</li>
              <li><strong>UI Issues:</strong> Layout problems, text overflow, spacing issues</li>
              <li><strong>Mobile Experience:</strong> Test on your phone - does it work well?</li>
              <li><strong>Confusing Features:</strong> Anything unclear or hard to figure out</li>
              <li><strong>Missing Features:</strong> What would make this better?</li>
              <li><strong>Performance:</strong> Does it feel slow? Where?</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">How to Report Issues:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Send feedback via the <Mail className="inline h-4 w-4" /> Messages page to user <strong>@ackpack34</strong></li>
              <li>Include screenshots if possible (especially for visual bugs)</li>
              <li>Describe what you were doing when the issue occurred</li>
              <li>Note your device type (phone/tablet/desktop) and browser</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tips & Tricks */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tips & Tricks</h2>
        </div>

        <div className="space-y-3 text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-1">✓</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Search Database First</p>
              <p className="text-sm">Before manually adding a figure, click "Search Database" to see if it already exists. This saves time and ensures consistency!</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-1">✓</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Master Database</p>
              <p className="text-sm">Admins can view and edit the master figures database in Settings. All new figures you add automatically contribute to this shared resource.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-1">✓</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Image Position</p>
              <p className="text-sm">When editing a figure, click the image and use the position controls to frame it perfectly.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-1">✓</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Jealousy Scores</p>
              <p className="text-sm">Fire reactions = 3 points, Love = 2 points, Like = 1 point. See your top figures on the My Collection page!</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-1">✓</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Desktop vs Mobile</p>
              <p className="text-sm">The app is responsive! Try it on both desktop and mobile - they have optimized layouts for each.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-1">✓</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Pagination</p>
              <p className="text-sm">Change "Figures per page" to 10, 25, 50, or 100 based on your preference. The 5-column grid aligns with these numbers!</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-1">✓</div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Optional Backups</p>
              <p className="text-sm">Your data is safe in the cloud, but you can still export your collection for personal backups via Gallery → Export/Import.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Thank You */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Thank You for Beta Testing!</h2>
        <p className="text-lg opacity-90">
          Your feedback will help make this the best action figure tracking app for collectors. Enjoy testing and YO JOE! 🪖
        </p>
      </section>
    </div>
  );
}


export default BetaGuidePage;