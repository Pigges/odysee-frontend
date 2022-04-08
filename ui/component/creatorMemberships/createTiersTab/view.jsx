/* eslint-disable no-console */
// @flow
import React from 'react';
import Page from 'component/page';
import * as ICONS from 'constants/icons';
import * as MODALS from 'constants/modal_types';
import Button from 'component/button';
import { useHistory } from 'react-router';
import * as PAGES from 'constants/pages';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'component/common/tabs';
import { FormField } from 'component/common/form';
import { Lbryio } from 'lbryinc';
import { getStripeEnvironment } from 'util/stripe';
import moment from 'moment';
import CopyableText from 'component/copyableText';
import ChannelSelector from 'component/channelSelector';
import { formatLbryUrlForWeb } from 'util/url';
import { URL } from 'config';
import { lbryProxy as Lbry } from '../../../web/lbry';

let stripeEnvironment = getStripeEnvironment();

const TAB_QUERY = 'tab';

const TABS = {
  MY_MEMBERSHIPS: 'my_memberships',
  CREATE_TIERS: 'create_tiers',
  MY_SUPPORTERS: 'my_supporters',
  MY_PLEDGES: 'my_pledges',
};

const isDev = process.env.NODE_ENV !== 'production';

let log = (input) => {};
if (isDev) log = console.log;

type Props = {
  openModal: (string, {}) => void,
  activeChannelClaim: ?ChannelClaim,
};

export default function CreatorAnalytics(props: Props) {
  const {
    openModal,
    activeChannelClaim,
    doToast,
    claim,
    doResolveClaimIds,
    claimsById,
  } = props;

  const {
    location: { search },
    push,
  } = useHistory();

  let membershipTiers = [{
    displayName: 'Helping Hand',
    description: 'You\'re doing your part, thank you!',
    monthlyContributionInUSD: 5,
    perks: ['exclusiveAccess', 'badge'],
  }, {
    displayName: 'Big-Time Supporter',
    description: 'You are a true fan and are helping in a big way!',
    monthlyContributionInUSD: 10,
    perks: ['exclusiveAccess', 'earlyAccess', 'badge', 'emojis'],
  }, {
    displayName: 'Community MVP',
    description: 'Where would this creator be without you? You are a true legend!',
    monthlyContributionInUSD: 20,
    perks: ['exclusiveAccess', 'earlyAccess', 'badge', 'emojis', 'custom-badge'],
  }];

  const perkDescriptions = [{
    perkName: 'exclusiveAccess',
    perkDescription: 'You will exclusive access to members-only content',
  }, {
    perkName: 'earlyAccess',
    perkDescription: 'You will get early access to this creators content',
  }, {
    perkName: 'badge',
    perkDescription: 'You will get a generic badge showing you are a supporter of this creator',
  }, {
    perkName: 'emojis',
    perkDescription: 'You will get access to custom members-only emojis offered by the creator',
  }, {
    perkName: 'custom-badge',
    perkDescription: 'You can choose a custom badge showing you are an MVP supporter',
  }];

  const [isEditing, setIsEditing] = React.useState(false);

  const [creatorMemberships, setCreatorMemberships] = React.useState(membershipTiers);

  const [editTierDescription, setEditTierDescription] = React.useState('');

  const editMembership = function (e, tierIndex, tierDescription) {
    setEditTierDescription(tierDescription);
    setIsEditing(tierIndex);
  };

  const deleteMembership = function (tierIndex) {
    let membershipsBeforeDeletion = creatorMemberships;

    const amountOfMembershipsCurrently = creatorMemberships.length;
    if (amountOfMembershipsCurrently === 1) {
      const displayString = __('You must have at least one tier for your membership options');
      return doToast({ message: displayString, isError: true });
    }

    openModal(MODALS.CONFIRM_DELETE_MEMBERSHIP, {
      setCreatorMemberships,
      membershipsBeforeDeletion,
      tierIndex,
    });
  };

  const addMembership = function () {
    const amountOfMembershipsCurrently = creatorMemberships.length;

    const nextMembershipOrdinal = moment.localeData().ordinal(amountOfMembershipsCurrently + 1);

    let amountOfMembershipsLeft;
    if (amountOfMembershipsCurrently === 4) {
      amountOfMembershipsLeft = 'This is the maximum amount you can have';
    } else {
      amountOfMembershipsLeft = `You can add ${5 - (amountOfMembershipsCurrently + 1)} more`;
    }

    const newMembership = {
      displayName: 'New Membership Tier',
      description: `Here's your ${nextMembershipOrdinal} added tier. ${amountOfMembershipsLeft}.`,
      monthlyContributionInUSD: 5,
      perks: ['exclusiveAccess', 'badge'],
    };

    setCreatorMemberships([...creatorMemberships, newMembership]);
  };

  const handleChange = (event) => {
    setEditTierDescription(event.target.value);
  };

  const cancelEditingMembership =  function () {
    setIsEditing(false);
  };

  function saveMembership(tierIndex) {
    const copyOfMemberships = creatorMemberships;

    const newTierName = document.querySelectorAll('input[name=tier_name]')[0]?.value;
    const newTierDescription = editTierDescription;
    const newTierMonthlyContribution = document.querySelectorAll('input[name=tier_contribution]')[0]?.value;

    let selectedPerks = [];

    for (const perkDescription of perkDescriptions) {
      const odyseePerkSelected = document.getElementById(perkDescription.perkName).checked;
      if (odyseePerkSelected) {
        selectedPerks.push(perkDescription.perkName);
      }
    }

    const newObject = {
      displayName: newTierName,
      description: newTierDescription,
      monthlyContributionInUSD: newTierMonthlyContribution,
      perks: selectedPerks,
    };

    copyOfMemberships[tierIndex] = newObject;

    setCreatorMemberships(copyOfMemberships);

    setIsEditing(false);
  }

  function createEditTier(tier, membershipIndex) {
    const containsPerk = function(perk) {
      return tier.perks.indexOf(perk) > -1;
    };

    return (
      <div className="edit-div" style={{ marginBottom: '45px' }}>
        <FormField
          type="text"
          name="tier_name"
          label={__('Tier Name')}
          defaultValue={tier.displayName}
        />
        {/* could be cool to have markdown */}
        {/* <FormField */}
        {/*  type="markdown" */}
        {/* /> */}
        <FormField
          type="textarea"
          rows="10"
          name="tier_description"
          label={__('Tier Description (You can also add custom benefits here)')}
          placeholder={__('Description of your tier')}
          value={editTierDescription}
          onChange={handleChange}
        />
        <label htmlFor="tier_name" style={{ marginTop: '15px', marginBottom: '8px' }}>Odysee Perks</label>
        {perkDescriptions.map((tierPerk, i) => (
          <>
            <FormField
              type="checkbox"
              defaultChecked={containsPerk(tierPerk.perkName)}
              // disabled={!optimizeAvail}
              // onChange={() => setUserOptimize(!userOptimize)}
              label={tierPerk.perkDescription}
              name={tierPerk.perkName}
            />
          </>
        ))}
        <FormField
          className="form-field--price-amount"
          type="number"
          name="tier_contribution"
          step="1"
          label={__('Monthly Contribution ($/Month)')}
          defaultValue={tier.monthlyContributionInUSD}
          onChange={(event) => parseFloat(event.target.value)}
        />
        <div className="section__actions">
          <Button button="primary" label={'Save Tier'} onClick={() => saveMembership(membershipIndex)} />
          <Button button="link" label={__('Cancel')} onClick={cancelEditingMembership} />
        </div>
      </div>
    );
  }

  return (
    <div className="create-tiers-div">

      <div className="memberships-header" style={{ marginBottom: 'var(--spacing-xl)'}}>
        <h1 style={{ fontSize: '24px', marginBottom: 'var(--spacing-s)' }}>Create Your Membership Tiers</h1>
        <h2 style={{ fontSize: '18px' }}>Define the tiers that your viewers can subscribe to</h2>
      </div>

      {/* list through different tiers */}
      {creatorMemberships.map((membershipTier, membershipIndex) => (
        <>
          {isEditing === membershipIndex && (
            <>
              {createEditTier(membershipTier, membershipIndex)}
            </>
          )}
          {isEditing !== membershipIndex && (
            <div style={{ marginBottom: 'var(--spacing-xxl)'}}>
              <div style={{ marginBottom: 'var(--spacing-s)', fontSize: '1.1rem' }}>{membershipIndex + 1}) Tier Name: {membershipTier.displayName}</div>
              <h1 style={{ marginBottom: 'var(--spacing-s)'}}>{membershipTier.description}</h1>
              <h1 style={{ marginBottom: 'var(--spacing-s)'}}>Monthly Pledge: ${membershipTier.monthlyContributionInUSD}</h1>
              {membershipTier.perks.map((tierPerk, i) => (
                <>
                  <p>
                    {/* list all the perks */}
                    {perkDescriptions.map((globalPerk, i) => (
                      <>
                        {tierPerk === globalPerk.perkName && (
                          <>
                            <ul>
                              <li>
                                {globalPerk.perkDescription}
                              </li>
                            </ul>
                          </>
                        )}
                      </>
                    ))}
                  </p>
                </>
              ))}
              <div className="buttons-div" style={{ marginTop: '13px' }}>
                {/* cancel membership button */}
                <Button
                  button="alt"
                  onClick={(e) => editMembership(e, membershipIndex, membershipTier.description)}
                  className="edit-membership-button"
                  label={__('Edit Tier')}
                  icon={ICONS.EDIT}
                />
                {/* cancel membership button */}
                <Button
                  button="alt"
                  onClick={(e) => deleteMembership(membershipIndex)}
                  className="cancel-membership-button"
                  label={__('Delete Tier')}
                  icon={ICONS.DELETE}
                />
              </div>
            </div>
          )}
        </>
      ))}

      { creatorMemberships.length < 5 && (
        <>
          <Button
            button="primary"
            onClick={(e) => addMembership()}
            className="add-membership-button"
            label={__('Add Tier')}
            icon={ICONS.ADD}
          />
        </>
      )}
    </div>
  );
};
