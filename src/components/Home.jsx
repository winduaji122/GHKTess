import React, { useState, useEffect, useCallback } from 'react';
import FeaturedPost from './FeaturedPost';
import PostCard from './PostCard';
import Pagination from './Pagination';
import SpotlightWidget from './SpotlightWidget';
import PopularPostsWidget from './PopularPostsWidget';
import Carousel from './Carousel/Carousel';
import './Home.css';
import { getAllPosts, getFeaturedPosts, getSpotlightPosts } from '../api/postApi';
import 'bootstrap/dist/css/bootstrap.min.css';

function Home() {
  const [featuredPost, setFeaturedPost] = useState(null);
  const [latestPosts, setLatestPosts] = useState([]);
  const [spotlightPosts, setSpotlightPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const postsPerPage = 6;

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Prioritaskan permintaan penting terlebih dahulu
      const postsData = await getAllPosts(currentPage, postsPerPage);

      console.log('Posts data received:', postsData);

      if (postsData?.posts && Array.isArray(postsData.posts)) {
        setLatestPosts(postsData.posts);
        setTotalPages(postsData.pagination?.totalPages || 1);
        setTotalPosts(postsData.pagination?.totalCount || 0);
      } else {
        console.error('Invalid posts data structure:', postsData);
      }

      // Kemudian buat permintaan lain secara bersamaan dengan batasan
      const [featuredPostData, spotlightData] = await Promise.all([
        getFeaturedPosts(),
        getSpotlightPosts()
      ]);

      if (featuredPostData?.success && featuredPostData?.data?.length > 0) {
        setFeaturedPost(featuredPostData.data[0]);
      } else {
        setFeaturedPost(null);
      }

      if (spotlightData) {
        setSpotlightPosts(spotlightData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal mengambil data. Silakan coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, postsPerPage]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    console.log('Latest posts:', latestPosts);
    console.log('Featured post:', featuredPost);
    console.log('Spotlight posts:', spotlightPosts);
  }, [latestPosts, featuredPost, spotlightPosts]);

  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  if (loading) return null;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="home-container">
      {/* Carousel Section */}
      <section className="carousel-section">
        <Carousel />
      </section>

      <div className="main-content">
        <div className="left-column">
          {featuredPost && (
            <section className="featured-post-section">
              <FeaturedPost post={featuredPost} />
            </section>
          )}
          <section className="latest-posts-section">
            <h2 className="section-title">Berita</h2>
            {latestPosts.length > 0 ? (
              <>
                <div className="posts-grid">
                  {latestPosts.map((post, index) => (
                    <PostCard
                      key={post.id || index}
                      post={post}
                      index={index}
                      isSpotlight={false}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    loading={loading}
                  />
                )}
              </>
            ) : (
              <div className="no-posts">Tidak ada berita untuk ditampilkan</div>
            )}
          </section>
        </div>
        <aside className="right-column">
          <SpotlightWidget posts={spotlightPosts} limit={4} />
        </aside>
      </div>

      {/* Popular Section */}
      <section className="popular-section">
        <div className="writer-popular-container">
          <PopularPostsWidget limit={4} />
        </div>
      </section>
    </div>
  );
}

export default Home;
