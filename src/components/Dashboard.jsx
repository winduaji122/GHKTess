import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
// Tidak perlu import PostStats karena kita menggunakan komponen kustom
import { getDashboardStats, getRecentPosts, getRecentActivities } from '../api/dashboardApi';
import '../styles/dashboard.css';
import { useAuth } from '../contexts/AuthContext';
import {
  DocumentTextIcon,
  PencilSquareIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { FaHeart } from 'react-icons/fa';

// Komponen untuk statistik
const StatCard = ({ title, value, icon, change }) => {
  // Format angka dengan pemisah ribuan
  const formatNumber = (num) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  // Tentukan tipe perubahan berdasarkan nilai change
  const actualChangeType = change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral';

  // Nilai absolut untuk ditampilkan
  const absChange = Math.abs(change || 0);

  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-header">
        <div>
          <h3 className="dashboard-stat-title">{title}</h3>
          <p className="dashboard-stat-value">{formatNumber(value)}</p>
        </div>
        <div className="dashboard-stat-icon-container">
          {React.cloneElement(icon, { className: 'dashboard-stat-icon' })}
        </div>
      </div>
      {change !== undefined && (
        <div className={`dashboard-stat-change dashboard-stat-change-${actualChangeType}`}>
          {actualChangeType === 'increase' ? (
            <ArrowUpIcon className="dashboard-stat-change-icon h-3 w-3" />
          ) : actualChangeType === 'decrease' ? (
            <ArrowDownIcon className="dashboard-stat-change-icon h-3 w-3" />
          ) : null}
          <span>{absChange}% {actualChangeType === 'neutral' ? 'tidak ada perubahan' : 'dibanding bulan lalu'}</span>
        </div>
      )}
    </div>
  );
};

// Komponen untuk aktivitas terbaru
const ActivityItem = ({ title, description, time, icon }) => {
  return (
    <div className="dashboard-activity-item">
      <div className="dashboard-activity-icon-container">
        {React.cloneElement(icon, { className: 'dashboard-activity-icon h-4 w-4' })}
      </div>
      <div className="dashboard-activity-details">
        <h4 className="dashboard-activity-title">{title}</h4>
        <p className="dashboard-activity-description">{description}</p>
      </div>
      <div className="dashboard-activity-time">
        <ClockIcon className="dashboard-activity-time-icon h-3 w-3" />
        {time}
      </div>
    </div>
  );
};

// Komponen untuk post terbaru
const RecentPost = ({ title, date, views, status, image, comments_count = 0, likes_count = 0 }) => {
  return (
    <div className="dashboard-recent-post">
      {image ? (
        <img
          src={image.startsWith('http') ? image : `${import.meta.env.VITE_API_BASE_URL}/uploads/${image}`}
          alt={title}
          className="dashboard-post-image"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/48?text=No+Image';
          }}
        />
      ) : (
        <div className="dashboard-post-image">
          <DocumentTextIcon className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <div className="dashboard-post-details">
        <h4 className="dashboard-post-title">{title}</h4>
        <div className="dashboard-post-meta">
          <span className="dashboard-post-date">{date}</span>
          <div className="dashboard-post-stats">
            <span className="post-stats-item">
              <EyeIcon className="post-stats-icon h-3 w-3" />
              {views}
            </span>
            <span className="post-stats-item">
              <ChatBubbleLeftIcon className="post-stats-icon h-3 w-3" />
              {comments_count}
            </span>
            <span className="post-stats-item">
              <HeartIcon className="post-stats-icon h-3 w-3" />
              {likes_count}
            </span>
          </div>
        </div>
      </div>
      <div className={`dashboard-post-status dashboard-status-${status}`}>
        {status === 'published' ? 'Published' : status === 'draft' ? 'Draft' : 'Archived'}
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
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  // Ambil data user dari auth context
  const userRole = user?.role || 'writer';
  const userName = user?.name || 'User';

  // Set judul halaman dengan useEffect
  useEffect(() => {
    document.title = "Dashboard | Gema Hati Kudus";
  }, []);

  // Redirect ke login jika user tidak terautentikasi
  useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate, isLoading]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Hanya fetch data jika user sudah login
        if (!isLoggedIn) {
          // Set default data jika belum login
          setStats({
            posts: 0,
            views: 0,
            comments: 0,
            likes: 0,
            users: userRole === 'admin' ? 0 : null,
            changes: {}
          });
          setRecentPosts([]);
          setActivities([]);
          return;
        }

        // Fetch dashboard stats
        const statsResponse = await getDashboardStats();
        if (statsResponse.success) {
          setStats({
            posts: statsResponse.data.posts || 0,
            views: statsResponse.data.views || 0,
            comments: statsResponse.data.comments || 0,
            likes: statsResponse.data.likes || 0,
            users: userRole === 'admin' ? statsResponse.data.writers || 0 : null,
            changes: statsResponse.data.changes || {}
          });
        } else {
          console.error('Error fetching dashboard stats:', statsResponse.message || 'Unknown error');
          // Fallback data jika gagal
          setStats({
            posts: 0,
            views: 0,
            comments: 0,
            likes: 0,
            users: userRole === 'admin' ? 0 : null,
            changes: {}
          });
        }

        // Fetch recent posts
        const postsResponse = await getRecentPosts();
        if (postsResponse.success) {
          setRecentPosts(postsResponse.data || []);
        } else {
          console.error('Error fetching recent posts:', postsResponse.message || 'Unknown error');
          setRecentPosts([]);
        }

        // Fetch recent activities
        const activitiesResponse = await getRecentActivities();
        if (activitiesResponse.success) {
          // Map activities to include icons
          const formattedActivities = activitiesResponse.data.map(activity => {
            let icon;

            switch (activity.type) {
              case 'post':
                icon = <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
                break;
              case 'comment':
                icon = <PencilSquareIcon className="h-5 w-5 text-blue-500" />;
                break;
              case 'like':
                icon = <FaHeart className="h-5 w-5 text-blue-500" />;
                break;
              case 'user':
                icon = <UserGroupIcon className="h-5 w-5 text-blue-500" />;
                break;
              default:
                icon = <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
            }

            return {
              ...activity,
              icon
            };
          });

          setActivities(formattedActivities);
        } else {
          console.error('Error fetching recent activities:', activitiesResponse.message || 'Unknown error');
          setActivities([]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole, isLoggedIn]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="dashboard-skeleton dashboard-container">
          <Skeleton height={50} width={300} className="mb-4" />
          <Skeleton height={20} width={200} className="mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Array(3).fill(0).map((_, index) => (
              <div key={index} className="dashboard-stat-skeleton">
                <Skeleton height={100} className="mb-2" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="dashboard-section-skeleton">
              <Skeleton height={30} width={200} className="mb-4" />
              {Array(5).fill(0).map((_, index) => (
                <div key={index} className="dashboard-item-skeleton mb-3">
                  <Skeleton height={24} className="mb-2" />
                  <Skeleton height={16} width="60%" />
                </div>
              ))}
            </div>

            <div className="dashboard-section-skeleton">
              <Skeleton height={30} width={200} className="mb-4" />
              <Skeleton height={200} className="mb-2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            Selamat Datang, {userName}
          </h1>
          <p className="dashboard-subtitle">
            Berikut adalah ringkasan aktivitas dan statistik Anda
          </p>
        </div>

        {/* Navigation */}
        <nav className="admin-nav">
          <Link
            to="/dashboard"
            className="admin-nav-button active"
          >
            Dashboard
          </Link>
          <Link
            to={userRole === 'admin' ? '/admin/posts' : '/writer/posts'}
            className="admin-nav-button"
          >
            Postingan
          </Link>

        </nav>

        {/* Stats */}
        <section aria-labelledby="stats-heading" className="dashboard-stats-section">
          <h2 id="stats-heading" className="sr-only">Statistik</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StatCard
              title="Total Post"
              value={stats.posts}
              icon={<DocumentTextIcon className="h-6 w-6 text-blue-500" />}
              change={stats.changes?.posts}
            />

            <StatCard
              title="Total Views"
              value={stats.views}
              icon={<EyeIcon className="h-6 w-6 text-blue-500" />}
              change={stats.changes?.views}
            />

            <StatCard
              title="Komentar"
              value={stats.comments}
              icon={<PencilSquareIcon className="h-6 w-6 text-blue-500" />}
              change={stats.changes?.comments}
            />

            <StatCard
              title="Likes"
              value={stats.likes}
              icon={<FaHeart className="h-5 w-5 text-blue-500" />}
              change={stats.changes?.likes}
            />

            {userRole === 'admin' && (
              <StatCard
                title="Total Writer"
                value={stats.users}
                icon={<UserGroupIcon className="h-6 w-6 text-blue-500" />}
                change={stats.changes?.writers}
              />
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section aria-labelledby="actions-heading" className="dashboard-actions-section">
          <h2 id="actions-heading" className="dashboard-actions-title">Aksi Cepat</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Link
              to={userRole === 'admin' ? '/admin/posts/create' : '/writer/add-post'}
              className="dashboard-action-card"
            >
              <div className="dashboard-action-icon-container">
                <DocumentTextIcon className="dashboard-action-icon h-5 w-5" />
              </div>
              <span className="dashboard-action-text">Buat Post Baru</span>
            </Link>

            <Link
              to={userRole === 'admin' ? '/admin/posts' : '/writer/posts'}
              className="dashboard-action-card"
            >
              <div className="dashboard-action-icon-container">
                <PencilSquareIcon className="dashboard-action-icon h-5 w-5" />
              </div>
              <span className="dashboard-action-text">Kelola Post</span>
            </Link>

            {userRole === 'admin' && (
              <>
                <Link
                  to="/admin/comments"
                  className="dashboard-action-card"
                >
                  <div className="dashboard-action-icon-container">
                    <PencilSquareIcon className="dashboard-action-icon h-5 w-5" />
                  </div>
                  <span className="dashboard-action-text">Moderasi Komentar</span>
                </Link>

                <Link
                  to="/admin/users"
                  className="dashboard-action-card"
                >
                  <div className="dashboard-action-icon-container">
                    <UserGroupIcon className="dashboard-action-icon h-5 w-5" />
                  </div>
                  <span className="dashboard-action-text">Kelola Writer</span>
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Two column layout for larger screens */}
        <div className="dashboard-content-grid">
          {/* Recent Posts */}
          <section aria-labelledby="recent-posts-heading">
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h2 id="recent-posts-heading" className="dashboard-section-title">Post Terbaru</h2>
                <Link to={userRole === 'admin' ? '/admin/posts' : '/writer/posts'} className="dashboard-view-all">
                  Lihat Semua
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </Link>
              </div>
              <div className="dashboard-section-content">
                {recentPosts.length > 0 ? (
                  <div className="space-y-0">
                    {recentPosts.map(post => (
                      <RecentPost key={post.id} {...post} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Belum ada post</p>
                )}

                <div className="dashboard-section-footer">
                  <Link
                    to={userRole === 'admin' ? '/admin/posts' : '/writer/posts'}
                    className="dashboard-view-all"
                  >
                    Lihat semua post
                    <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section aria-labelledby="recent-activity-heading">
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h2 id="recent-activity-heading" className="dashboard-section-title">Aktivitas Terbaru</h2>
              </div>
              <div className="dashboard-section-content">
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
    </main>
  );
}