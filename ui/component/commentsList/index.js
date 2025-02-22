import { connect } from 'react-redux';
import {
  selectClaimForUri,
  selectClaimIsMine,
  selectFetchingMyChannels,
  selectClaimsByUri,
} from 'redux/selectors/claims';
import {
  selectTopLevelCommentsForUri,
  makeSelectTopLevelTotalPagesForUri,
  selectIsFetchingComments,
  selectIsFetchingCommentsById,
  selectIsFetchingReacts,
  selectTotalCommentsCountForUri,
  selectOthersReacts,
  selectMyReacts,
  selectCommentIdsForUri,
  selectSettingsByChannelId,
  selectPinnedCommentsForUri,
} from 'redux/selectors/comments';
import { doCommentReset, doCommentList, doCommentById, doCommentReactList } from 'redux/actions/comments';
import { selectActiveChannelClaim } from 'redux/selectors/app';
import { getChannelIdFromClaim } from 'util/claim';
import { doFetchUserMemberships } from 'redux/actions/user';
import CommentsList from './view';

const select = (state, props) => {
  const { uri } = props;

  const claim = selectClaimForUri(state, uri);
  const activeChannelClaim = selectActiveChannelClaim(state);

  return {
    topLevelComments: selectTopLevelCommentsForUri(state, uri),
    allCommentIds: selectCommentIdsForUri(state, uri),
    pinnedComments: selectPinnedCommentsForUri(state, uri),
    topLevelTotalPages: makeSelectTopLevelTotalPagesForUri(uri)(state),
    totalComments: selectTotalCommentsCountForUri(state, uri),
    claimId: claim && claim.claim_id,
    channelId: getChannelIdFromClaim(claim),
    claimIsMine: selectClaimIsMine(state, claim),
    isFetchingComments: selectIsFetchingComments(state),
    isFetchingCommentsById: selectIsFetchingCommentsById(state),
    isFetchingReacts: selectIsFetchingReacts(state),
    fetchingChannels: selectFetchingMyChannels(state),
    settingsByChannelId: selectSettingsByChannelId(state),
    myReactsByCommentId: selectMyReacts(state),
    othersReactsById: selectOthersReacts(state),
    activeChannelId: activeChannelClaim && activeChannelClaim.claim_id,
    claimsByUri: selectClaimsByUri(state),
  };
};

const perform = {
  fetchTopLevelComments: doCommentList,
  fetchComment: doCommentById,
  fetchReacts: doCommentReactList,
  resetComments: doCommentReset,
  doFetchUserMemberships,
};

export default connect(select, perform)(CommentsList);
