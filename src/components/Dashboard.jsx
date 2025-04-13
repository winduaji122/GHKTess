import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  PencilSquareIcon, 
  ChartBarIcon, 
  UserGroupIcon, 
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// Komponen untuk statistik
const StatCard = ({ title, value, icon, change, changeType }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-3 rounded-full bg-blue-50">
          {icon}
        </div>
      </div>
      {change && (
        <div className={`flex items-center text-sm ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
          {changeType === 'increase' ? 
            <ArrowUpIcon className="h-3 w-3 mr-1" /> : 
            <ArrowDownIcon className="h-3 w-3 mr-1" />
          }
          <span>{change}% dibanding bulan lalu</span>
        </div>
      )}
    </div>
  );
};

// Komponen untuk aktivitas terbaru
const ActivityItem = ({ title, description, time, icon }) => {
  return (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-0">
      <div className="p-2 rounded-full bg-blue-50 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-grow">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="text-xs text-gray-400 flex items-center flex-shrink-0">
        <ClockIcon className="h-3 w-3 mr-1" />
        {time}
      </div>
    </div>
  );
};

// Komponen untuk post terbaru
const RecentPost = ({ title, date, views, status, image }) => {
  return (
    <div className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-0">
      {image ? (
        <img src={image} alt={title} className="w-12 h-12 object-cover rounded" />
      ) : (
        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
          <DocumentTextIcon className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <div className="flex-grow">
        <h4 className="font-medium text-gray-900 line-clamp-1">{title}</h4>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <span>{date}</span>
          <span className="mx-2">•</span>
          <span className="flex items-center">
            <EyeIcon className="h-3 w-3 mr-1" />
            {views} views
          </span>
        </div>
      </div>
      <div className={`px-2 py-1 rounded text-xs font-medium ${
        status === 'published' ? 'bg-green-100 text-green-800' : 
        status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
        'bg-red-100 text-red-800'
      }`}>
        {status === 'published' ? 'Published' : 
         status === 'draft' ? 'Draft' : 'Rejected'}
      </div>
    </div>
  );
};

// Komponen utama Dashboard
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ambil data user dari localStorage
  const userData = JSON.parse(localStorage.getItem('userData'));
  const userRole = userData?.role || 'writer';
  const userName = userData?.name || 'User';
  
  // Set judul halaman dengan useEffect
  useEffect(() => {
    document.title = "Dashboard | Gema Hati Kudus";
  }, []);
  
  useEffect(() => {
    // Simulasi fetch data
    setTimeout(() => {
      // Data dummy untuk demo
      setStats({
        posts: userRole === 'admin' ? 156 : 24,
        views: userRole === 'admin' ? 8432 : 1245,
        comments: userRole === 'admin' ? 243 : 37,
        users: userRole === 'admin' ? 42 : null
      });
      
      setRecentPosts([
        {
          id: 1,
          title: 'Refleksi Iman di Tengah Pandemi',
          date: '2 hari yang lalu',
          views: 234,
          status: 'published',
          image: 'https://source.unsplash.com/random/100x100?church'
        },
        {
          id: 2,
          title: 'Perjalanan Rohani Menuju Paskah',
          date: '5 hari yang lalu',
          views: 187,
          status: 'published',
          image: 'https://source.unsplash.com/random/100x100?prayer'
        },
        {
          id: 3,
          title: 'Makna Natal Bagi Umat Kristiani',
          date: '1 minggu yang lalu',
          views: 321,
          status: 'draft',
          image: 'https://source.unsplash.com/random/100x100?christmas'
        }
      ]);
      
      setActivities([
        {
          id: 1,
          title: 'Post baru dipublikasikan',
          description: 'Refleksi Iman di Tengah Pandemi telah dipublikasikan',
          time: '2 jam yang lalu',
          icon: <DocumentTextIcon className="h-5 w-5 text-blue-500" />
        },
        {
          id: 2,
          title: 'Komentar baru',
          description: 'Ada 5 komentar baru yang perlu dimoderasi',
          time: '5 jam yang lalu',
          icon: <PencilSquareIcon className="h-5 w-5 text-blue-500" />
        },
        {
          id: 3,
          title: 'Writer baru bergabung',
          description: 'Maria Angelica telah bergabung sebagai writer',
          time: '1 hari yang lalu',
          icon: <UserGroupIcon className="h-5 w-5 text-blue-500" />
        }
      ]);
      
      setIsLoading(false);
    }, 1000);
  }, [userRole]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <main className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Selamat Datang, {userName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Berikut adalah ringkasan aktivitas dan statistik Anda
            </p>
          </div>
        </div>
        
        {/* Stats */}
        <section aria-labelledby="stats-heading" className="mb-8">
          <h2 id="stats-heading" className="sr-only">Statistik</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StatCard 
              title="Total Post" 
              value={stats.posts} 
              icon={<DocumentTextIcon className="h-6 w-6 text-blue-500" />}
              change="12"
              changeType="increase"
            />
            
            <StatCard 
              title="Total Views" 
              value={stats.views} 
              icon={<EyeIcon className="h-6 w-6 text-blue-500" />}
              change="8"
              changeType="increase"
            />
            
            <StatCard 
              title="Komentar" 
              value={stats.comments} 
              icon={<PencilSquareIcon className="h-6 w-6 text-blue-500" />}
              change="5"
              changeType="decrease"
            />
            
            {userRole === 'admin' && (
              <StatCard 
                title="Total Writer" 
                value={stats.users} 
                icon={<UserGroupIcon className="h-6 w-6 text-blue-500" />}
                change="3"
                changeType="increase"
              />
            )}
          </div>
        </section>
        
        {/* Quick Actions */}
        <section aria-labelledby="actions-heading" className="mb-8">
          <h2 id="actions-heading" className="text-lg font-medium text-gray-900 mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Link 
              to={userRole === 'admin' ? '/admin/posts/create' : '/writer/add-post'} 
              className="bg-white shadow-sm rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow flex items-center"
            >
              <div className="p-2 rounded-full bg-blue-50 mr-3">
                <DocumentTextIcon className="h-5 w-5 text-blue-500" />
              </div>
              <span className="font-medium">Buat Post Baru</span>
            </Link>
            
            <Link 
              to={userRole === 'admin' ? '/admin/posts' : '/writer/posts'} 
              className="bg-white shadow-sm rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow flex items-center"
            >
              <div className="p-2 rounded-full bg-blue-50 mr-3">
                <PencilSquareIcon className="h-5 w-5 text-blue-500" />
              </div>
              <span className="font-medium">Kelola Post</span>
            </Link>
            
            {userRole === 'admin' && (
              <>
                <Link 
                  to="/admin/comments" 
                  className="bg-white shadow-sm rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow flex items-center"
                >
                  <div className="p-2 rounded-full bg-blue-50 mr-3">
                    <PencilSquareIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="font-medium">Moderasi Komentar</span>
                </Link>
                
                <Link 
                  to="/admin/users" 
                  className="bg-white shadow-sm rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow flex items-center"
                >
                  <div className="p-2 rounded-full bg-blue-50 mr-3">
                    <UserGroupIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="font-medium">Kelola Writer</span>
                </Link>
              </>
            )}
          </div>
        </section>
        
        {/* Two column layout for larger screens */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Posts */}
          <section aria-labelledby="recent-posts-heading">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 id="recent-posts-heading" className="text-lg font-medium text-gray-900">Post Terbaru</h2>
              </div>
              <div className="p-6">
                {recentPosts.length > 0 ? (
                  <div className="space-y-0">
                    {recentPosts.map(post => (
                      <RecentPost key={post.id} {...post} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Belum ada post</p>
                )}
                
                <div className="mt-6">
                  <Link 
                    to={userRole === 'admin' ? '/admin/posts' : '/writer/posts'} 
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Lihat semua post →
                  </Link>
                </div>
              </div>
            </div>
          </section>
          
          {/* Recent Activity */}
          <section aria-labelledby="recent-activity-heading">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 id="recent-activity-heading" className="text-lg font-medium text-gray-900">Aktivitas Terbaru</h2>
              </div>
              <div className="p-6">
                {activities.length > 0 ? (
                  <div className="space-y-0">
                    {activities.map(activity => (
                      <ActivityItem key={activity.id} {...activity} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Belum ada aktivitas</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}