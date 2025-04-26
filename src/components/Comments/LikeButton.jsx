import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getLikeStatus, addLike, removeLike } from '../../api/likeApi';
import { FaHeart, FaRegHeart, FaComment } from 'react-icons/fa';
import { Menu, Transition } from '@headlessui/react';
import { getValidProfileUrl } from '../../utils/profileHelper';
import { getInitials } from '../../utils/avatarHelper';
import './Comments.css';

const LikeButton = ({ postId, commentCount = 0 }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [recentLikes, setRecentLikes] = useState([]);
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // Fungsi untuk memuat status like
  const fetchLikeStatus = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('auth_user'));
      console.log('Fetching like status for post:', postId);
      console.log('Current user:', userData);

      // Tambahkan delay kecil untuk memastikan server memiliki waktu untuk memproses operasi sebelumnya
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await getLikeStatus(postId);
      console.log('Full like status response:', response);

      if (response.success) {
        // Periksa struktur respons
        if (response.data && typeof response.data === 'object') {
          console.log('Like status data structure:', Object.keys(response.data));

          // Berdasarkan struktur respons dari backend
          // Backend mengembalikan: { totalLikes, userLiked, userData, recentLikes }
          const likeData = response.data;

          // Cek apakah user saat ini ada di daftar recentLikes
          let userLikedFromList = false;
          if (userData && userData.id && likeData.recentLikes && Array.isArray(likeData.recentLikes)) {
            userLikedFromList = likeData.recentLikes.some(like => like.user_id === userData.id);
            console.log('User liked from recentLikes check in component:', userLikedFromList);
          }

          // Ambil nilai userLiked dan totalLikes
          // Prioritaskan hasil pengecekan recentLikes jika userLikedFromList adalah true
          let userLiked = userLikedFromList || likeData.userLiked === true;

          // Log untuk debugging
          console.log('userLiked from server:', likeData.userLiked);
          console.log('userLiked from recentLikes check:', userLikedFromList);
          console.log('Final userLiked value:', userLiked);

          const totalLikes = likeData.totalLikes || 0;
          const recentLikesData = likeData.recentLikes || [];

          console.log('Backend format - User has liked this post:', userLiked);
          console.log('Total likes:', totalLikes);

          // Update state dengan data yang ditemukan
          console.log('Setting liked state to:', userLiked);
          setLiked(userLiked);
          setLikeCount(totalLikes);

          if (recentLikesData.length > 0) {
            console.log('Recent likes:', recentLikesData);
            setRecentLikes(recentLikesData);
          }
        } else {
          console.warn('Unexpected response data format:', response.data);
          setLiked(false);
          setLikeCount(0);
          setRecentLikes([]);
        }
      } else {
        console.warn('Like status response not successful:', response);
        // Set default values
        setLiked(false);
        setLikeCount(0);
        setRecentLikes([]);
      }
    } catch (error) {
      console.error('Error fetching like status:', error);
      // Set default values on error
      setLiked(false);
      setLikeCount(0);
      setRecentLikes([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  // Memuat status like saat komponen dimount atau postId berubah
  useEffect(() => {
    if (postId) {
      fetchLikeStatus();
    }
  }, [fetchLikeStatus, postId]);

  // Fungsi untuk menangani klik tombol like
  const handleLikeClick = async () => {
    if (!isLoggedIn) {
      // Redirect ke halaman login jika belum login
      navigate('/login', { state: { from: window.location.pathname + window.location.search } });
      return;
    }

    try {
      setAnimating(true);
      const userData = JSON.parse(localStorage.getItem('auth_user'));
      console.log('User data for like action:', userData);
      console.log('Current liked state before action:', liked);

      // Periksa status like terlebih dahulu untuk memastikan status terkini
      try {
        const currentStatus = await getLikeStatus(postId);
        console.log('Current like status before action:', currentStatus);

        if (currentStatus.success && currentStatus.data) {
          const likeData = currentStatus.data;

          // Cek apakah user saat ini ada di daftar recentLikes
          let userLikedFromList = false;
          if (userData && userData.id && likeData.recentLikes && Array.isArray(likeData.recentLikes)) {
            userLikedFromList = likeData.recentLikes.some(like => like.user_id === userData.id);
            console.log('User liked from recentLikes check in handleLikeClick:', userLikedFromList);
          }

          // Prioritaskan hasil pengecekan recentLikes jika userLikedFromList adalah true
          const currentUserLiked = userLikedFromList || likeData.userLiked === true;
          console.log('Current userLiked combined value:', currentUserLiked);

          // Update state dengan data terbaru dari server
          if (currentUserLiked !== liked) {
            console.log('Updating liked state to match server:', currentUserLiked);
            setLiked(currentUserLiked);
            setLikeCount(likeData.totalLikes || 0);

            // Jika status dari server berbeda dengan state lokal, gunakan status dari server
            if (currentUserLiked && !liked) {
              console.warn('User already liked this post according to server, but UI shows not liked');
              return; // Keluar dari fungsi karena user sudah like
            }
          }
        }
      } catch (statusError) {
        console.error('Error checking current like status:', statusError);
        // Lanjutkan dengan state yang ada jika gagal mendapatkan status terkini
      }

      // Toggle liked state untuk UX yang lebih baik
      const newLikedState = !liked;
      setLiked(newLikedState);
      setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

      if (liked) {
        // Hapus like
        console.log('Removing like for post:', postId);
        try {
          const response = await removeLike(postId);
          console.log('Remove like response:', response);

          // Periksa respons dari server
          if (response.success) {
            // Jika berhasil, gunakan data dari server
            // Backend mengembalikan: { totalLikes, userLiked, userData, recentLikes }
            const likeData = response.data;

            console.log('Like removed, server data:', likeData);

            // Update state dengan data dari server
            setLiked(likeData.userLiked === true);
            setLikeCount(likeData.totalLikes || 0);

            // Update recent likes
            if (likeData.recentLikes && likeData.recentLikes.length > 0) {
              console.log('Updated recent likes after unlike:', likeData.recentLikes);
              setRecentLikes(likeData.recentLikes);
            } else {
              // Jika tidak ada data recentLikes, kosongkan array
              setRecentLikes([]);
            }
          } else {
            console.warn('Remove like response not successful:', response);
            // Kembalikan state jika gagal
            setLiked(true);
            setLikeCount(prev => prev + 1);
          }
        } catch (removeError) {
          console.error('Error removing like:', removeError);
          // Jika error adalah 400 Bad Request, mungkin like sudah dihapus
          if (removeError.response && removeError.response.status === 400) {
            console.warn('Like may already be removed (400 Bad Request)');
            // Refresh status like untuk memastikan data yang akurat
            fetchLikeStatus();
          } else {
            // Kembalikan state untuk error lainnya
            setLiked(true);
            setLikeCount(prev => prev + 1);
          }
        }
      } else {
        // Tambahkan like
        console.log('Adding like for post:', postId);
        try {
          const response = await addLike(postId);
          console.log('Add like response:', response);

          // Periksa respons dari server
          if (response.success) {
            // Jika berhasil, gunakan data dari server
            // Backend mengembalikan: { likeId, totalLikes, userLiked, userData, recentLikes }
            const likeData = response.data;

            console.log('Like added, server data:', likeData);

            // Update state dengan data dari server
            setLiked(likeData.userLiked === true);
            setLikeCount(likeData.totalLikes || 0);

            // Update recent likes
            if (likeData.recentLikes && likeData.recentLikes.length > 0) {
              console.log('Updated recent likes after like:', likeData.recentLikes);
              setRecentLikes(likeData.recentLikes);
            }
          } else {
            console.warn('Add like response not successful:', response);
            // Kembalikan state jika gagal
            setLiked(false);
            setLikeCount(prev => Math.max(0, prev - 1));
          }
        } catch (addError) {
          console.error('Error adding like:', addError);
          // Jika error adalah 400 Bad Request, mungkin like sudah ditambahkan
          if (addError.response && addError.response.status === 400) {
            console.warn('Like may already exist (400 Bad Request)');
            // Refresh status like untuk memastikan data yang akurat
            fetchLikeStatus();
          } else {
            // Kembalikan state untuk error lainnya
            setLiked(false);
            setLikeCount(prev => Math.max(0, prev - 1));
          }
        }
      }

      // Refresh like status setelah operasi like/unlike untuk memastikan data yang akurat
      setTimeout(() => {
        fetchLikeStatus();
      }, 1000);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Kembalikan state jika terjadi error
      setLiked(liked);
      setLikeCount(prev => liked ? prev : Math.max(0, prev - 1));
      // Refresh status like untuk memastikan data yang akurat
      fetchLikeStatus();
    } finally {
      // Atur timeout untuk animasi
      setTimeout(() => {
        setAnimating(false);
      }, 500);
    }
  };

  // Format jumlah like
  const formatLikeCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count;
  };

  // Render avatar pengguna yang menyukai post
  const renderLikeAvatars = () => {
    // Validasi recentLikes
    if (!recentLikes || !Array.isArray(recentLikes) || recentLikes.length === 0) {
      return null;
    }

    return (
      <div className="writer-like-avatars">
        {recentLikes.slice(0, 3).map((like, index) => {
          // Validasi like object
          if (!like || typeof like !== 'object') {
            console.warn('Invalid like object:', like);
            return null;
          }

          // Pastikan selalu ada key yang valid
          const key = like.id || `like-avatar-${index}-${Date.now()}`;
          const userName = like.user_name || 'User';

          // Log untuk debugging
          if (like.profile_picture) {
            console.log(`LikeButton - Avatar ${index} original path:`, like.profile_picture);
          }

          return (
            <div
              key={key}
              className="writer-like-avatar"
              style={{ zIndex: 3 - index }}
            >
              {like.profile_picture ? (
                <img
                  src={like.profile_picture ? getValidProfileUrl(like.profile_picture) : null}
                  alt={`${userName}'s avatar`}
                  onError={(e) => {
                    console.log('Error loading image:', like.profile_picture);
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="writer-avatar-fallback"
                style={{ display: like.profile_picture ? 'none' : 'flex' }}
              >
                {getInitials(userName)}
              </div>
            </div>
          );
        }).filter(Boolean)} {/* Filter null values */}
      </div>
    );
  };

  // Tambahkan log untuk debugging
  console.log('Rendering LikeButton with liked state:', liked);
  console.log('Rendering LikeButton with likeCount:', likeCount);

  // Force liked state untuk debugging
  // const forceLiked = true; // Uncomment untuk memaksa tombol berwarna merah

  return (
    <div className="writer-like-button-container">
      <button
        className={`writer-like-button ${liked ? 'liked' : ''} ${animating ? 'animating' : ''}`}
        onClick={handleLikeClick}
        disabled={loading}
        aria-label={liked ? 'Unlike post' : 'Like post'}
        style={{
          color: liked ? '#e74c3c' : '',
          borderColor: liked ? '#e74c3c' : '',
          backgroundColor: liked ? 'rgba(231, 76, 60, 0.05)' : ''
        }}
      >
        {liked ?
          <FaHeart style={{ color: '#e74c3c' }} /> :
          <FaRegHeart />}
        <span className="writer-like-count" style={{ color: liked ? '#e74c3c' : '' }}>
          {formatLikeCount(likeCount)}
        </span>
      </button>

      <div
        className="writer-comment-button"
        onClick={() => {
          if (!isLoggedIn) {
            navigate('/login', { state: { from: window.location.pathname + window.location.search } });
            return;
          }
          // Scroll to comment form
          const commentForm = document.querySelector('.writer-comment-form');
          if (commentForm) {
            commentForm.scrollIntoView({ behavior: 'smooth' });
            const textarea = commentForm.querySelector('textarea');
            if (textarea) {
              textarea.focus();
            }
          }
        }}
      >
        <FaComment />
        <span className="writer-comment-count">{formatLikeCount(commentCount)}</span>
      </div>

      {likeCount > 0 && (
        <Menu as="div" className="writer-likers-menu">
          <div className="writer-liked-by-text">Liked by</div>
          <Menu.Button className="writer-likers-button">
            {renderLikeAvatars()}
            {likeCount > 3 && (
              <div className="writer-like-more" title="Lihat semua yang menyukai">
                +{likeCount - 3}
              </div>
            )}
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95 translate-y-[-10px]"
            enterTo="transform opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="transform opacity-100 scale-100 translate-y-0"
            leaveTo="transform opacity-0 scale-95 translate-y-[-10px]"
          >
            <Menu.Items className="writer-likers-dropdown">
              <div className="writer-likers-dropdown-header">
                <h4>Disukai oleh</h4>
              </div>
              <div className="writer-likers-dropdown-content">
                {recentLikes && Array.isArray(recentLikes) && recentLikes.length > 0 ? (
                  <ul>
                    {recentLikes.map((like, index) => {
                      // Validasi like object
                      if (!like || typeof like !== 'object') {
                        console.warn('Invalid like object in dropdown:', like);
                        return null;
                      }

                      // Pastikan selalu ada key yang valid
                      const key = like.id || `liker-item-${index}-${Date.now()}`;
                      const userName = like.user_name || 'User';

                      // Log untuk debugging
                      if (like.profile_picture) {
                        console.log(`LikerDropdown - Avatar ${index} original path:`, like.profile_picture);
                      }

                      return (
                        <li key={key} className="writer-liker-item">
                          <div className="writer-liker-avatar">
                            {like.profile_picture ? (
                              <img
                                src={like.profile_picture ? getValidProfileUrl(like.profile_picture) : null}
                                alt={`${userName}'s avatar`}
                                onError={(e) => {
                                  console.log('Error loading image:', like.profile_picture);
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className="writer-avatar-fallback"
                              style={{ display: like.profile_picture ? 'none' : 'flex' }}
                            >
                              {getInitials(userName)}
                            </div>
                          </div>
                          <div className="writer-liker-info">
                            <span className="writer-liker-name">{userName}</span>
                            {like.user_role === 'admin' && (
                              <span className="writer-liker-badge admin">Admin</span>
                            )}
                            {like.user_role === 'writer' && (
                              <span className="writer-liker-badge writer">Penulis</span>
                            )}
                          </div>
                        </li>
                      );
                    }).filter(Boolean)} {/* Filter null values */}
                  </ul>
                ) : (
                  <p className="writer-likers-empty">Belum ada yang menyukai post ini</p>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      )}
    </div>
  );
};

export default LikeButton;
