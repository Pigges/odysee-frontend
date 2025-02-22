// @flow
import { COMMENT_PAGE_SIZE_TOP_LEVEL, SORT_BY } from 'constants/comment';
import { ENABLE_COMMENT_REACTIONS } from 'config';
import { useIsMobile, useIsMediumScreen } from 'effects/use-screensize';
import { getCommentsListTitle } from 'util/comments';
import * as ICONS from 'constants/icons';
import * as REACTION_TYPES from 'constants/reactions';
import Button from 'component/button';
import Card from 'component/common/card';
import classnames from 'classnames';
import CommentCreate from 'component/commentCreate';
import CommentView from 'component/comment';
import debounce from 'util/debounce';
import Empty from 'component/common/empty';
import React, { useEffect } from 'react';
import Spinner from 'component/spinner';
import usePersistedState from 'effects/use-persisted-state';
import useGetUserMemberships from 'effects/use-get-user-memberships';

const DEBOUNCE_SCROLL_HANDLER_MS = 200;

function scaleToDevicePixelRatio(value) {
  const devicePixelRatio = window.devicePixelRatio || 1.0;
  if (devicePixelRatio < 1.0) {
    return Math.ceil(value / devicePixelRatio);
  }
  return Math.ceil(value * devicePixelRatio);
}

type Props = {
  allCommentIds: any,
  pinnedComments: Array<Comment>,
  topLevelComments: Array<Comment>,
  topLevelTotalPages: number,
  uri: string,
  claimId?: string,
  channelId?: string,
  claimIsMine: boolean,
  isFetchingComments: boolean,
  isFetchingCommentsById: boolean,
  isFetchingReacts: boolean,
  linkedCommentId?: string,
  totalComments: number,
  fetchingChannels: boolean,
  myReactsByCommentId: ?{ [string]: Array<string> }, // "CommentId:MyChannelId" -> reaction array (note the ID concatenation)
  othersReactsById: ?{ [string]: { [REACTION_TYPES.LIKE | REACTION_TYPES.DISLIKE]: number } },
  activeChannelId: ?string,
  settingsByChannelId: { [channelId: string]: PerChannelSettings },
  commentsAreExpanded?: boolean,
  fetchTopLevelComments: (uri: string, parentId: ?string, page: number, pageSize: number, sortBy: number) => void,
  fetchComment: (commentId: string) => void,
  fetchReacts: (commentIds: Array<string>) => Promise<any>,
  resetComments: (claimId: string) => void,
  claimsByUri: { [string]: any },
  doFetchUserMemberships: (claimIdCsv: string) => void,
};

export default function CommentList(props: Props) {
  const {
    allCommentIds,
    uri,
    pinnedComments,
    topLevelComments,
    topLevelTotalPages,
    claimId,
    channelId,
    claimIsMine,
    isFetchingComments,
    isFetchingReacts,
    linkedCommentId,
    totalComments,
    fetchingChannels,
    myReactsByCommentId,
    othersReactsById,
    activeChannelId,
    settingsByChannelId,
    commentsAreExpanded,
    fetchTopLevelComments,
    fetchComment,
    fetchReacts,
    resetComments,
    claimsByUri,
    doFetchUserMemberships,
  } = props;

  const isMobile = useIsMobile();
  const isMediumScreen = useIsMediumScreen();

  const spinnerRef = React.useRef();
  const commentListRef = React.useRef();
  const DEFAULT_SORT = ENABLE_COMMENT_REACTIONS ? SORT_BY.POPULARITY : SORT_BY.NEWEST;
  const [sort, setSort] = usePersistedState('comment-sort-by', DEFAULT_SORT);
  const [page, setPage] = React.useState(1);
  const [didInitialPageFetch, setInitialPageFetch] = React.useState(false);
  const hasDefaultExpansion = commentsAreExpanded || !isMediumScreen || isMobile;
  const [expandedComments, setExpandedComments] = React.useState(hasDefaultExpansion);

  const totalFetchedComments = allCommentIds ? allCommentIds.length : 0;
  const channelSettings = channelId ? settingsByChannelId[channelId] : undefined;
  const moreBelow = page < topLevelTotalPages;
  const title = getCommentsListTitle(totalComments);

  // Display comments immediately if not fetching reactions
  // If not, wait to show comments until reactions are fetched
  const [readyToDisplayComments, setReadyToDisplayComments] = React.useState(
    Boolean(othersReactsById) || !ENABLE_COMMENT_REACTIONS
  );

  // get commenter claim ids for checking premium status
  const commenterClaimIds = topLevelComments.map((comment) => comment.channel_id);

  // update premium status
  const shouldFetchUserMemberships = true;
  useGetUserMemberships(
    shouldFetchUserMemberships,
    commenterClaimIds,
    claimsByUri,
    doFetchUserMemberships,
    [topLevelComments],
    true
  );

  const handleReset = React.useCallback(() => {
    if (claimId) resetComments(claimId);
    setPage(1);
  }, [claimId, resetComments]);

  function changeSort(newSort) {
    if (sort !== newSort) {
      setSort(newSort);
      setPage(0); // Invalidate existing comments
    }
  }

  // Force comments reset
  useEffect(() => {
    if (page === 0) {
      handleReset();
    }
  }, [handleReset, page]);

  // Reset comments only on claim switch
  useEffect(() => {
    return () => handleReset();
  }, [handleReset]);

  // Fetch top-level comments
  useEffect(() => {
    if (page !== 0) {
      if (page === 1 && linkedCommentId) {
        fetchComment(linkedCommentId);
      }

      fetchTopLevelComments(uri, undefined, page, COMMENT_PAGE_SIZE_TOP_LEVEL, sort);
    }

    // no need to listen for uri change, claimId change will trigger page which
    // will handle this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchComment, fetchTopLevelComments, linkedCommentId, page, sort]);

  // Fetch reacts
  useEffect(() => {
    if (totalFetchedComments > 0 && ENABLE_COMMENT_REACTIONS && !fetchingChannels && !isFetchingReacts) {
      let idsForReactionFetch;

      if (!othersReactsById || !myReactsByCommentId) {
        idsForReactionFetch = allCommentIds;
      } else {
        idsForReactionFetch = allCommentIds.filter((commentId) => {
          const key = activeChannelId ? `${commentId}:${activeChannelId}` : commentId;
          return !othersReactsById[key] || (activeChannelId && !myReactsByCommentId[key]);
        });
      }

      if (idsForReactionFetch.length !== 0) {
        fetchReacts(idsForReactionFetch)
          .then(() => {
            setReadyToDisplayComments(true);
          })
          .catch(() => setReadyToDisplayComments(true));
      }
    }
  }, [
    activeChannelId,
    allCommentIds,
    fetchReacts,
    fetchingChannels,
    isFetchingReacts,
    myReactsByCommentId,
    othersReactsById,
    totalFetchedComments,
  ]);

  // Scroll to linked-comment
  useEffect(() => {
    if (linkedCommentId) {
      window.pendingLinkedCommentScroll = true;
    } else {
      delete window.pendingLinkedCommentScroll;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (topLevelComments.length === 0) return;

    function shouldFetchNextPage(page, topLevelTotalPages, yPrefetchPx = 1000) {
      if (!spinnerRef || !spinnerRef.current) return false;

      const rect = spinnerRef.current.getBoundingClientRect(); // $FlowFixMe
      const windowH = window.innerHeight || document.documentElement.clientHeight; // $FlowFixMe
      const windowW = window.innerWidth || document.documentElement.clientWidth; // $FlowFixMe

      const isApproachingViewport = yPrefetchPx !== 0 && rect.top < windowH + scaleToDevicePixelRatio(yPrefetchPx);

      const isInViewport =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        // $FlowFixMe
        rect.top <= windowH &&
        // $FlowFixMe
        rect.left <= windowW;

      return (isInViewport || isApproachingViewport) && page < topLevelTotalPages;
    }

    const handleCommentScroll = debounce(() => {
      if (shouldFetchNextPage(page, topLevelTotalPages)) {
        setPage(page + 1);
        setInitialPageFetch(true);
      }
    }, DEBOUNCE_SCROLL_HANDLER_MS);

    if (!didInitialPageFetch) {
      handleCommentScroll();
      setInitialPageFetch(true);
    }

    if (hasDefaultExpansion && !isFetchingComments && readyToDisplayComments && moreBelow) {
      const commentsInDrawer = Boolean(document.querySelector('.MuiDrawer-root .card--enable-overflow'));
      const scrollingElement = commentsInDrawer ? document.querySelector('.card--enable-overflow') : window;

      if (scrollingElement) {
        scrollingElement.addEventListener('scroll', handleCommentScroll);

        return () => scrollingElement.removeEventListener('scroll', handleCommentScroll);
      }
    }
  }, [
    topLevelComments,
    hasDefaultExpansion,
    didInitialPageFetch,
    isFetchingComments,
    isMobile,
    moreBelow,
    page,
    readyToDisplayComments,
    topLevelTotalPages,
  ]);

  const commentProps = { isTopLevel: true, threadDepth: 3, uri, claimIsMine, linkedCommentId };
  const actionButtonsProps = {
    totalComments,
    sort,
    changeSort,
    setPage,
    handleRefresh: () => setPage(0),
  };

  return (
    <Card
      className="card--enable-overflow"
      title={!isMobile && title}
      titleActions={<CommentActionButtons {...actionButtonsProps} />}
      actions={
        <>
          {isMobile && <CommentActionButtons {...actionButtonsProps} />}

          <CommentCreate uri={uri} />

          {channelSettings && channelSettings.comments_enabled && !isFetchingComments && !totalComments && (
            <Empty padded text={__('That was pretty deep. What do you think?')} />
          )}

          <ul
            ref={commentListRef}
            className={classnames('comments', {
              'comments--contracted': isMediumScreen && !expandedComments && totalComments > 1,
            })}
          >
            {readyToDisplayComments && (
              <>
                {pinnedComments && <CommentElements comments={pinnedComments} {...commentProps} />}
                <CommentElements comments={topLevelComments} {...commentProps} />
              </>
            )}
          </ul>

          {!hasDefaultExpansion && (
            <div className="card__bottom-actions card__bottom-actions--comments">
              {(!expandedComments || moreBelow) && totalComments > 1 && (
                <Button
                  button="link"
                  title={!expandedComments ? __('Expand') : __('More')}
                  label={!expandedComments ? __('Expand') : __('More')}
                  onClick={() => (!expandedComments ? setExpandedComments(true) : setPage(page + 1))}
                />
              )}
              {expandedComments && totalComments > 1 && (
                <Button
                  button="link"
                  title={__('Collapse')}
                  label={__('Collapse')}
                  onClick={() => {
                    setExpandedComments(false);
                    if (commentListRef.current) {
                      const ADDITIONAL_OFFSET = 200;
                      const refTop = commentListRef.current.getBoundingClientRect().top;
                      window.scrollTo({
                        top: refTop + window.pageYOffset - ADDITIONAL_OFFSET,
                        behavior: 'smooth',
                      });
                    }
                  }}
                />
              )}
            </div>
          )}

          {(isFetchingComments || (hasDefaultExpansion && moreBelow)) && (
            <div className="main--empty" ref={spinnerRef}>
              <Spinner type="small" />
            </div>
          )}
        </>
      }
    />
  );
}

type CommentProps = {
  comments: Array<Comment>,
};

const CommentElements = (commentProps: CommentProps) => {
  const { comments, ...commentsProps } = commentProps;

  return comments.map((comment) => <CommentView key={comment.comment_id} comment={comment} {...commentsProps} />);
};

type ActionButtonsProps = {
  totalComments: number,
  sort: string,
  changeSort: (string) => void,
  handleRefresh: () => void,
};

const CommentActionButtons = (actionButtonsProps: ActionButtonsProps) => {
  const { totalComments, sort, changeSort, handleRefresh } = actionButtonsProps;

  const sortButtonProps = { activeSort: sort, changeSort };

  return (
    <>
      {totalComments > 1 && ENABLE_COMMENT_REACTIONS && (
        <span className="comment__sort">
          <SortButton {...sortButtonProps} label={__('Best')} icon={ICONS.BEST} sortOption={SORT_BY.POPULARITY} />
          <SortButton
            {...sortButtonProps}
            label={__('Controversial')}
            icon={ICONS.CONTROVERSIAL}
            sortOption={SORT_BY.CONTROVERSY}
          />
          <SortButton {...sortButtonProps} label={__('New')} icon={ICONS.NEW} sortOption={SORT_BY.NEWEST} />
        </span>
      )}

      <Button button="alt" icon={ICONS.REFRESH} title={__('Refresh')} onClick={handleRefresh} />
    </>
  );
};

type SortButtonProps = {
  activeSort: string,
  sortOption: string,
  changeSort: (string) => void,
};

const SortButton = (sortButtonProps: SortButtonProps) => {
  const { activeSort, sortOption, changeSort, ...buttonProps } = sortButtonProps;

  return (
    <Button
      {...buttonProps}
      className={classnames(`button-toggle`, { 'button-toggle--active': activeSort === sortOption })}
      button="alt"
      iconSize={18}
      onClick={() => changeSort(sortOption)}
    />
  );
};
