import React, { useState, useEffect, useCallback } from 'react';
import FeaturedPost from './FeaturedPost';
import PostCard from './PostCard';
import Pagination from './Pagination';
import SpotlightWidget from './SpotlightWidget';
import PopularPostsWidget from './PopularPostsWidget';
import Carousel from './Carousel/Carousel';
import SEO from './SEO/SEO';
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
  const postsPerPage = 6;

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Buat semua permintaan secara paralel untuk meningkatkan performa
      const [postsData, featuredPostData, spotlightData] = await Promise.all([
        getAllPosts(currentPage, postsPerPage),
        getFeaturedPosts(),
        getSpotlightPosts()
      ]);

      // Proses data posts
      if (postsData?.posts && Array.isArray(postsData.posts)) {
        setLatestPosts(postsData.posts);
        setTotalPages(postsData.pagination?.totalPages || 1);
      } else {
        console.error('Invalid posts data structure:', postsData);
      }

      // Proses data featured post
      if (featuredPostData?.success && featuredPostData?.data?.length > 0) {
        setFeaturedPost(featuredPostData.data[0]);
      } else {
        setFeaturedPost(null);
      }

      // Proses data spotlight
      if (spotlightData) {
        setSpotlightPosts(spotlightData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal mengambil data. Silakan coba lagi nanti.');

      // Jika terjadi error, coba ambil data secara terpisah untuk meningkatkan ketahanan
      try {
        const postsData = await getAllPosts(currentPage, postsPerPage);
        if (postsData?.posts && Array.isArray(postsData.posts)) {
          setLatestPosts(postsData.posts);
          setTotalPages(postsData.pagination?.totalPages || 1);
        }
      } catch (postsError) {
        console.error('Error fetching posts:', postsError);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, postsPerPage]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Hapus log yang tidak perlu untuk meningkatkan performa
  // useEffect(() => {
  //   console.log('Latest posts:', latestPosts);
  //   console.log('Featured post:', featuredPost);
  //   console.log('Spotlight posts:', spotlightPosts);
  // }, [latestPosts, featuredPost, spotlightPosts]);

  const handlePageChange = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  if (loading) return null;
  if (error) return <div className="error">{error}</div>;

  // Data terstruktur untuk halaman beranda
  const homeStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Gema Hati Kudus",
    "url": import.meta.env.VITE_FRONTEND_URL || window.location.origin,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${import.meta.env.VITE_FRONTEND_URL || window.location.origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <div className="home-container">
      <SEO
        title="Gema Hati Kudus - Portal Berita Skolastikat SCJ Yogyakarta"
        description="Portal berita Skolastikat SCJ Yogyakarta yang menyajikan informasi terkini seputar Gereja Katolik, spiritualitas, dan kegiatan Skolastikat SCJ Yogyakarta."
        keywords="katolik, gereja katolik, berita katolik, spiritualitas, skolastikat scj yogyakarta, scj jogja, iman katolik, indonesia"
        ogType="website"
        structuredData={homeStructuredData}
      />

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
