import "cally";
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function Home() {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [category, setCategory] = useState('Category');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [errorFound, setErrorFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState(false);
  const [transactionAdded, setTransactionAdded] = useState(false);
  const calendarRef = useRef(null);
  const buttonRef = useRef(null);
  const [dateDisplay, setDateDisplay] = useState('Date');
  const [totalGroup, setTotalGroup] = useState('');
  const [repaidAmounts, setRepaidAmounts] = useState(['']);
  const [groupTotal, setGroupTotal] = useState('--.--');
  const [firstName, setFirstName] = useState('');
  const id = localStorage.getItem('token');
  const welcomeMessage = "Hello " + localStorage.getItem('firstName') + ",";
  const [setupErrorFound, setSetupErrorFound] = useState('');
  const [setupErrorMessage, setSetupErrorMessage] = useState('');
  const [assets, setAssets] = useState([{ title: '', balance: '', accountType: 'debit', limit: '' }]);
  const [sources, setSources] = useState([]);
  const [transactionSource, setTransactionSource] = useState('');
  const [sourceInputTitle, setSourceInputTitle] = useState('Source');
  const [transactionRepayment, setTransactionRepayment] = useState('');
  const [repaymentInputTitle, setRepaymentInputTitle] = useState('Destination');
  const [creditAccounts, setCreditAccounts] = useState([]);
  const [debitAccounts, setDebitAccounts] = useState([]);


  useEffect(() => {
    const calendar = document.querySelector('calendar-date');

    const handleChange = (e) => {
        const value = e.target.value; 
        if (value) {
            const [year, month, day] = value.split("-");
            const formatted = `${day}/${month}/${year}`;
            setDateDisplay(formatted);
            setDate(formatted);
            document.getElementById("cally-popover1")?.hidePopover();
        }
    };

    calendar?.addEventListener('change', handleChange);
    return () => calendar?.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/users/${id}`);
        setFirstName(response.data.firstName);
        setSources(response.data.sources);
        setCreditAccounts(response.data.sources.filter(tx => tx.accountType === "credit"));
        setDebitAccounts(response.data.sources.filter(tx => tx.accountType === "debit"));
        if (response.data.firstTimeSetup === false) {
          document.getElementById('first_time_setup').showModal(); 
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const popover = document.getElementById('cally-popover1');
      if (
        popover &&
        !popover.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        if (popover.matches(':popover-open')) {
          popover.hidePopover(); 
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const newTransaction = async () => {
        if (title === '') {
            setErrorMessage("Title cannot be empty");
            setErrorFound(true);
            return;
        }
        if (amount === '') {
            setErrorMessage("Amount cannot be empty");
            setErrorFound(true);
            return;
        }
        if (amount <= 0) {
            setErrorMessage("Amount cannot be 0 or less");
            setErrorFound(true);
            return;
        }
        if (transactionType === '') {
            setErrorMessage("Select a transaction type");
            setErrorFound(true);
            return;
        }
        if ((transactionSource === '' || transactionSource === 'Source') && transactionType === 'Expense') {
            setErrorMessage("Select a transaction source");
            setErrorFound(true);
            return;
        }
        if ((transactionSource === '' || transactionSource === 'Destination') && transactionType === 'Income') {
            setErrorMessage("Select a transaction destination");
            setErrorFound(true);
            return;
        }
        if ((category === 'Credit Repayment' && transactionRepayment === '') || (category === 'Credit Repayment' && transactionRepayment === 'Destination')) {
          setErrorMessage("Select a repayment destination");
          setErrorFound(true);
          return;
        }
        let finalDate = date;
        if (date === '') {
            const today = new Date();
            finalDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
            setDate(finalDate);
        }
        const roundedAmount = Number(amount).toFixed(2);
        let appendTransaction = {};
        if (category === 'Credit Repayment') {
          appendTransaction = {
            title: title,
            amount: roundedAmount,
            transactionType: transactionType,
            category: category,
            source: transactionSource,
            date: finalDate,
            note: note, 
            repayment: transactionRepayment
          }
        } else {
          appendTransaction = {
            title: title,
            amount: roundedAmount,
            transactionType: transactionType,
            category: category,
            source: transactionSource,
            date: finalDate,
            note: note 
          }
        }

        try {
          await axios.put(`http://localhost:3000/users/transactions/${id}`, { transaction: appendTransaction });
          updateSourceBalances(roundedAmount);
          setErrorFound(false);
          setErrorMessage('');
          setTitle('');
          setAmount('');
          setTransactionType('');
          setCategory('Category');
          setDate('');
          setDateDisplay('Date');
          setNote('');
          setTransactionAdded(true);
          setTransactionSource('');
          setTimeout(() => {
              setTransactionAdded(false);
          }, 5000); 
        } catch (err) {
          console.log(err);
        }
    };

    const handleGroupChange = (value, check, index) => {
      let newTotal = '';
        if (check === 'total') {
          setTotalGroup(value);
          newTotal = calculateTotal(value, repaidAmounts);
        } 
        if (check === 'not total') {
          repaidAmounts[index] = value;
          newTotal = calculateTotal(totalGroup, repaidAmounts);
        } 

        setGroupTotal(Number(newTotal).toFixed(2));
    };

    const calculateTotal = (total, lessArray) => {
        let result = Number(total);
        for (let i = 0; i < lessArray.length; i++) {
            result -= Number(lessArray[i]);
        }
        return result;
    };

    const addGroupTransaction = () => {
        if (groupTotal === '--.--') {
          setRepaidAmounts(['']);
          setTotalGroup('');
          return;
        }
        if (groupTotal <= 0) {
          setGroupTotal(Math.abs(groupTotal));
          setAmount(Math.abs(groupTotal));
          setTransactionType('Income');
        } else {
          setAmount(groupTotal);
          setTransactionType('Expense');
        }
        setRepaidAmounts(['']);
        setTotalGroup('');
        setGroupTotal('--.--');
    };

    const handleAssetChange = (index, field, value) => {
      const updatedAssets = [...assets];
      updatedAssets[index][field] = value;
      setAssets(updatedAssets);
    };

    const addAsset = () => {
      setAssets([...assets, { title: '', balance: '', accountType: 'debit', limit: '' }]);
    };

    const submitFirstTime = async () => {
      for (let i = 0; i < assets.length; i++) {
        if (assets[i].title === '' || assets[i].amount === '') {
          setSetupErrorMessage("Input fields cannot be empty");
          setSetupErrorFound(true);
          return;
        }

        try {
          await axios.put(`http://localhost:3000/users/sources/${id}`, { firstTimeSetup: true, sources: assets  });
          setSources(assets);
          setCreditAccounts(assets.filter(tx => tx.accountType === "credit"));
          setDebitAccounts(assets.filter(tx => tx.accountType === "debit"));
          document.getElementById('first_time_setup').close();
          setAssets([{ title: '', amount: '' }]);
          setSetupErrorMessage('');
          setSetupErrorFound(false);
        } catch (err) {
          console.log(err);
        }
      }
    };

    const resetSetup = () => {
        setAssets([{ title: '', amount: '' }]);
        setSetupErrorMessage('');
        setSetupErrorFound(false);
    };

    const updateSourceBalances = async (newAmount) => {
        const response = await axios.get(`http://localhost:3000/sources/${id}`);
        let newSourceBalance = 0;
        let newRepaymentBalance = 0;
        let newRepayment;
        const newSource = response.data.sources.find(source => source.title === transactionSource); 
        if (category === 'Credit Repayment') {
          newSourceBalance = Number(newSource.balance) - Number(newAmount);
          newRepayment = response.data.sources.find(source => source.title === transactionRepayment); 
          newRepaymentBalance = Number(newRepayment.balance) + Number(newAmount);
        }
        if (category !== 'Credit Repayment' && transactionType === 'Income') {
          newSourceBalance = Number(newSource.balance) + Number(newAmount);
        }
        if (category !== 'Credit Repayment' && transactionType === 'Expense') {
          newSourceBalance = Number(newSource.balance) - Number(newAmount);
        }
        await axios.put(`http://localhost:3000/users/sources/${id}/balance`, { title: newSource.title, newBalance: newSourceBalance });
        if (category === 'Credit Repayment') { 
          await axios.put(`http://localhost:3000/users/sources/${id}/balance`, { title: newRepayment.title, newBalance: newRepaymentBalance });
        }
    }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full items-start">
        <h1 className="text-4xl font-bold mt-5 ml-5 text-start">{"Hello " + firstName + ","}</h1>
      </div>
      <div className="flex flex-col items-center bg-base-200 pb-8 w-100 mt-10 rounded-xl mb-4">
        <div className="flex flex-col items-center w-full bg-base-300 rounded-xl pb-5">
            <h1 className="text-3xl font-bold mt-5">Add a New Transaction</h1>
        </div>
        <input type="text" value={title} className="input mt-5" placeholder="Title" onChange={(e) => setTitle(e.target.value)} />
        <label className="input bg-base-200 pr-0 !gap-0 mt-3 focus-within:outline-none">
          <span className="label bg-base-200 !mr-0">$</span>
          <input
            type="number"
            className="input validator bg-base-100 rounded-l-none"
            step="any"
            required
            value={amount}
            placeholder="Amount"
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="bg-base-200 p-2 rounded hover:bg-base-300" aria-label="Group" onClick={()=>document.getElementById('my_modal_1').showModal()}>
            <img
              src="https://fonts.gstatic.com/s/i/materialiconsoutlined/group/v17/24px.svg"
              alt="Group Transaction"
              className="w-5 h-5"
            />
          </button>
          <dialog id="my_modal_1" className="modal">
            <div className="modal-box w-90 flex flex-col items-center overflow-y-auto overflow-x-hidden">
              <h3 className="font-bold text-lg">Add Group Transaction</h3>
              <label className="input bg-base-200 pr-0 !gap-0 mt-3 focus-within:outline-none flex-shrink-0">
                <span className="label bg-base-200 !mr-0">$</span>
                <input
                  type="number"
                  className="input validator bg-base-100 rounded-l-none !w-300"
                  step="any"
                  required
                  value={totalGroup}
                  placeholder="Total Amount Paid"
                  onChange={(e) => {
                    handleGroupChange(e.target.value, 'total');
                  }}
                />
              </label>
              <hr className="w-full border border-gray-300 my-4" />
              <div className="w-90 flex flex-col items-start ml-10">
                <p className="text-neutral italic">less repayments</p>
                {repaidAmounts.map((value, index) => (
                  <label
                    key={index}
                    className="input bg-base-200 pr-0 !gap-0 mt-3 focus-within:outline-none"
                  >
                    <span className="label bg-base-200 !mr-0">$</span>
                    <input
                      type="number"
                      className="input validator bg-base-100 rounded-l-none !w-300"
                      step="any"
                      required
                      value={value}
                      placeholder="Amount"
                      onChange={(e) => {
                        const updated = [...repaidAmounts];
                        updated[index] = e.target.value;
                        setRepaidAmounts(updated);
                        handleGroupChange(e.target.value, 'not total', index);
                      }}
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="btn btn-outline btn-sm mt-3"
                  onClick={() => setRepaidAmounts([...repaidAmounts, ''])}
                >
                  +
                </button>
              </div>
              <div className="w-90 flex flex-col items-end mr-10 mt-5">
                <p>Total: ${groupTotal}</p>
              </div>
                <form method="dialog" className="mt-5">
                  {/* if there is a button in form, it will close the modal */}
                  <button className="btn btn-secondary mr-2" onClick={addGroupTransaction}>Add Transaction</button>
                  <button className="btn" onClick={() => {
                    setRepaidAmounts(['']);
                    setTotalGroup('');
                    setGroupTotal('--.--');
                  }}>Close
                  </button>
                </form>
            </div>
          </dialog>
        </label>

        <div className="join w-80 mt-3">
          <button
            className={`btn w-[50%] rounded-md rounded-r-none ${transactionType === 'Income' ? 'btn-success' : 'btn-soft btn-success'}`}
            onClick={() => {
                setTransactionType('Income');
                setCategory('Salary');
                setSourceInputTitle('Destination');
            }}
          >
            Income
          </button>
          <button
            className={`btn w-[50%] rounded-xl rounded-l-none ${transactionType === 'Expense' ? 'btn-error' : 'btn-soft btn-error'}`}
            onClick={() => {
                setTransactionType('Expense');
                setCategory('Food');
                setSourceInputTitle('Source');
            }}
          >
            Expense
          </button>
        </div>

        <select
            className="select mt-3"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            >
            <option value="" disabled>
              Category
            </option>
            {!transactionType && (
                <option disabled>Category</option>
            )}

            {transactionType === 'Income' &&
                ['Salary', 'Youth Allowance', 'Other'].map((cat) => (
                <option key={cat}>{cat}</option>
                ))}

            {transactionType === 'Expense' &&
                ['Food', 'Subscriptions', 'Shopping', 'Transportation', 'Going Out', 'Other', 'Credit Repayment'].map((cat) => (
                <option key={cat}>{cat}</option>
                ))}
        </select>
          {category !== 'Credit Repayment' && (
              <select
              className="select mt-3"
              value={transactionSource}
              onChange={(e) => setTransactionSource(e.target.value)}
            >
              <option value="" disabled>
                {sourceInputTitle}
              </option>
              {sources.map((source, index) => (
                <option key={index} value={source.title}>
                  {source.title}
                </option>
              ))}
            </select>
          )}
          {category === 'Credit Repayment' && (
            <select
              className="select mt-3"
              value={transactionSource}
              onChange={(e) => setTransactionSource(e.target.value)}
            >
              <option value="" disabled>
                {sourceInputTitle}
              </option>
              {debitAccounts.map((account, index) => (
                <option key={index} value={account.title}>
                  {account.title}
                </option>
              ))}
            </select>
          )}

          {category === 'Credit Repayment' && (
            <select
              className="select mt-3"
              value={transactionRepayment}
              onChange={(e) => setTransactionRepayment(e.target.value)}
            >
              <option value="" disabled>
                {repaymentInputTitle}
              </option>
              {creditAccounts.map((account, index) => (
                <option key={index} value={account.title}>
                  {account.title}
                </option>
              ))}
            </select>
          )}

        <button
        ref={buttonRef}
        popoverTarget="cally-popover1"
        className="input input-border mt-3 flex justify-between items-center gap-2"
        title="Defaults to today's date"
        id="cally1"
        style={{ anchorName: '--cally1' }}
        >
        <span>{dateDisplay}</span>
        <span className="badge badge-neutral badge-xs">Optional</span>
        </button>

        <div
          ref={calendarRef}
          popover="auto"
          id="cally-popover1"
          className="dropdown bg-base-100 rounded-box shadow-lg"
          style={{ positionAnchor: '--cally1' }}
        >
          <calendar-date className="cally">
            <svg
              aria-label="Previous"
              className="fill-current size-4"
              slot="previous"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M15.75 19.5 8.25 12l7.5-7.5"></path>
            </svg>
            <svg
              aria-label="Next"
              className="fill-current size-4"
              slot="next"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
            </svg>
            <calendar-month></calendar-month>
          </calendar-date>
        </div>
        <div className="relative w-80 mt-3">
            <textarea className="textarea h-24 w-full" value={note} placeholder="Note" onChange={(e) => setNote(e.target.value)}></textarea>
            <span className="badge badge-neutral badge-xs absolute bottom-2 left-2">Optional</span>
        </div>
        {errorFound && (
          <div role="alert" className="alert alert-warning mt-3 p-3 w-80">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {transactionAdded && (
          <div className="toast toast-end">
            <div className="alert alert-success">
                <span>Transaction Added</span>
            </div>
        </div>
        )}

        <button className="btn btn-neutral mt-5 w-80" onClick={newTransaction}>Add Transaction</button>
        <dialog id="first_time_setup" className="modal">
          <div className="modal-box overflow-y-auto overflow-x-hidden">
            <h3 className="font-bold text-2xl text-center">First Time Setup</h3>
            <h3 className="font-bold text-lg mt-3">Assets</h3>
            <hr className="w-full border border-gray-300 mt-3" />
            <p className="py-4">Record your current balances</p>
            <div className="flex flex-col gap-3">
                    {assets.map((asset, index) => (
                      <div key={index}>
                        <div className="join gap-3 mt-3">
                          <input type="radio" name={`account-type-${index}`} className="radio radio-neutral" onChange={() => handleAssetChange(index, 'accountType', 'debit')} defaultChecked />
                          <p>Debit Account</p>
                          <input type="radio" name={`account-type-${index}`} className="radio radio-neutral" checked={asset.accountType === 'credit'} onChange={() => handleAssetChange(index, 'accountType', 'credit')} />
                          <p>Credit Account</p>
                        </div>
                        <div className="join gap-3 mt-3">
                          <input
                            type="text"
                            className="input rounded-md w-70"
                            placeholder="Source Title"
                            value={asset.title}
                            onChange={(e) => handleAssetChange(index, 'title', e.target.value)}
                          />
                          <label className="input bg-base-200 pr-0 !gap-0 focus-within:outline-none rounded-md">
                            <span className="label bg-base-200 !mr-0">$</span>
                            <input
                              type="number"
                              className="input validator bg-base-100 rounded-l-none"
                              step="any"
                              required
                              value={asset.balance}
                              placeholder="Balance"
                              onChange={(e) => handleAssetChange(index, 'balance', e.target.value)}
                            />
                          </label>
                          {asset.accountType === 'credit' && (
                            <label className="input bg-base-200 pr-0 !gap-0 focus-within:outline-none rounded-md">
                            <span className="label bg-base-200 !mr-0">$</span>
                            <input
                              type="number"
                              className="input validator bg-base-100 rounded-l-none"
                              step="any"
                              required
                              value={asset.limit}
                              placeholder="Limit"
                              onChange={(e) => handleAssetChange(index, 'limit', e.target.value)}
                            />
                          </label>
                          )}
                        </div>
                      </div>
                    ))}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm mt-3"
              onClick={addAsset}
            >
              +
            </button> 
            {setupErrorFound && (
              <div role="alert" className="alert alert-warning mt-4 p-3 w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{setupErrorMessage}</span>
              </div>
            )}
            <div className="flex justify-center mt-5 gap-4">
              <button className="btn btn-secondary" onClick={submitFirstTime}>Submit</button>
              <button className="btn" onClick={resetSetup}>Reset</button>
            </div>
          </div>
        </dialog>
    </div>
    </div>
  );
}

export default Home;
